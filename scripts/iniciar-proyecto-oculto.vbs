' Ejecuta el proyecto sin mostrar ventana CMD (oculto en segundo plano)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\iniciar-proyecto.bat""", 0, False
