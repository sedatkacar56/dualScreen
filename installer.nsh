!macro customInit
  ; Check if app is already installed
  ReadRegStr $0 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\{${APP_GUID}}" "DisplayVersion"
  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONQUESTION "DualScreen v$0 is already installed.$\n$\nDo you want to replace it with the new version?" IDYES continue IDNO abort
    abort:
      Abort
    continue:
      ; Silently run uninstaller first
      ReadRegStr $1 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\{${APP_GUID}}" "UninstallString"
      ${If} $1 != ""
        ExecWait '"$1" /S'
      ${EndIf}
  ${EndIf}
!macroend
