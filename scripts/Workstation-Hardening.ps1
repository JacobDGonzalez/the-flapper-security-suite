param(
    [switch]$WhatIf,
    [string]$LogPath = "\\192.168.8.11\SecurityLogs\Hardening\${env:COMPUTERNAME}.log"
)

Get-NetTCPConnection -State Listen |
Select-Object LocalPort, LocalAddress, OwningProcess |
ConvertTo-Json
``` [1][2]


# Ensure log directory
$logDir = Split-Path $LogPath -Parent
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}



function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp`t$Message" | Out-File -FilePath $LogPath -Append -Encoding UTF8
}

function Require-Admin {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "This script must be run as Administrator." -ForegroundColor Red
        Write-Log  "ERROR: Script not run as Administrator."
        exit 1
    }
}

Require-Admin
Write-Log "===== Hardening run started. WhatIf=$($WhatIf.IsPresent) ====="

function Set-Smbv1Disabled {
    Write-Log "Checking SMBv1 state..."
    $smbServer = Get-WindowsOptionalFeature -Online -FeatureName "SMB1Protocol" -ErrorAction SilentlyContinue
    if ($smbServer -and $smbServer.State -eq "Disabled") {
        Write-Log "SMBv1 already disabled."
        return
    }

    Write-Log "SMBv1 is enabled or not fully disabled. Target: Disabled."
    if ($WhatIf) {
        Write-Host "[WhatIf] Would disable SMBv1 protocol."
        return
    }

    Disable-WindowsOptionalFeature -Online -FeatureName "SMB1Protocol" -NoRestart -ErrorAction Stop
    Write-Log "SMBv1 disabled (Disable-WindowsOptionalFeature)."
}

function Set-FirewallEnabled {
    Write-Log "Checking firewall profiles..."
    $profiles = Get-NetFirewallProfile
    foreach ($p in $profiles) {
        if (-not $p.Enabled) {
            Write-Log "Firewall profile '$($p.Name)' is disabled. Target: Enabled."
            if ($WhatIf) {
                Write-Host "[WhatIf] Would enable firewall profile $($p.Name)."
            }
            else {
                Set-NetFirewallProfile -Name $p.Name -Enabled True -ErrorAction Stop
                Write-Log "Firewall profile '$($p.Name)' enabled."
            }
        }
        else {
            Write-Log "Firewall profile '$($p.Name)' already enabled."
        }
    }
}

function Set-RdpState {
    param(
        [bool]$AllowRdp = $false  # change to $true if your policy allows RDP
    )

    $rdpKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server"
    $value = Get-ItemProperty -Path $rdpKey -Name "fDenyTSConnections" -ErrorAction SilentlyContinue

    if ($AllowRdp) {
        $target = 0
        $msg = "allow"
    }
    else {
        $target = 1
        $msg = "deny"
    }

    if ($value -and $value.fDenyTSConnections -eq $target) {
        Write-Log "RDP already configured to $msg connections."
        return
    }

    Write-Log "RDP not in desired state. Target: $msg connections (fDenyTSConnections=$target)."
    if ($WhatIf) {
        Write-Host "[WhatIf] Would set RDP fDenyTSConnections=$target."
        return
    }

    Set-ItemProperty -Path $rdpKey -Name "fDenyTSConnections" -Value $target -ErrorAction Stop
    Write-Log "RDP registry value updated to $target."
}

function Set-UacHardened {
    Write-Log "Checking UAC level..."
    $uacKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
    $cur = Get-ItemProperty -Path $uacKey -Name "ConsentPromptBehaviorAdmin", "EnableLUA" -ErrorAction SilentlyContinue

    # Example: Require consent for non‑Windows binaries, keep UAC on
    $desiredConsent = 2
    $desiredEnable = 1
    $changes = @()

    if (-not $cur -or $cur.ConsentPromptBehaviorAdmin -ne $desiredConsent) {
        $changes += "ConsentPromptBehaviorAdmin -> $desiredConsent"
    }
    if (-not $cur -or $cur.EnableLUA -ne $desiredEnable) {
        $changes += "EnableLUA -> $desiredEnable"
    }

    if ($changes.Count -eq 0) {
        Write-Log "UAC already at desired level."
        return
    }

    Write-Log ("UAC not at desired level. Changes: {0}" -f ($changes -join ", "))
    if ($WhatIf) {
        Write-Host "[WhatIf] Would apply UAC changes: $($changes -join ', ')."
        return
    }

    Set-ItemProperty -Path $uacKey -Name "ConsentPromptBehaviorAdmin" -Value $desiredConsent -ErrorAction Stop
    Set-ItemProperty -Path $uacKey -Name "EnableLUA" -Value $desiredEnable -ErrorAction Stop
    Write-Log "UAC settings updated. Reboot required for some changes."
}

# MAIN
try {
    Set-Smbv1Disabled
    Set-FirewallEnabled
    Set-RdpState -AllowRdp:$false
    Set-UacHardened
    Write-Log "Hardening completed successfully."
}
catch {
    Write-Log ("ERROR: {0}" -f $_.Exception.Message)
    throw
}

