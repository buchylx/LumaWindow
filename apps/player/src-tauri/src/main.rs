#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Emitter, Manager};
mod system_events;

#[tauri::command]
fn lifecycle_status(
    status: tauri::State<'_, system_events::LifecycleStatus>,
) -> system_events::LifecycleStatus {
    status.inner().clone()
}

#[tauri::command]
fn record_validation(app: tauri::AppHandle, entry: String) -> Result<(), String> {
    if !std::env::args()
        .any(|arg| arg == "--self-test" || arg == "--platform-test" || arg == "--quick-test")
    {
        return Err("Validation mode is disabled".into());
    }
    if entry.len() > 16384 {
        return Err("Entry too large".into());
    }
    let _: serde_json::Value = serde_json::from_str(&entry).map_err(|e| e.to_string())?;
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(
            dir.join(if std::env::args().any(|arg| arg == "--platform-test") {
                "platform-validation.jsonl"
            } else {
                "validation.jsonl"
            }),
        )
        .map_err(|e| e.to_string())?;
    writeln!(file, "{}", entry).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            record_validation,
            lifecycle_status,
            system_events::sync_lifecycle
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                app.manage(system_events::install(&window));
            }
            if std::env::args().any(|arg| arg == "--platform-test") {
                if let Some(window) = app.get_webview_window("main") {
                    window.eval(
                        "window.location.replace(window.location.pathname + '?platformtest=1')",
                    )?;
                }
            }
            if std::env::args().any(|arg| arg == "--quick-test") {
                if let Some(window) = app.get_webview_window("main") {
                    window.eval(
                        "window.location.replace(window.location.pathname + '?selftest=quick')",
                    )?;
                }
            }
            if std::env::args().any(|arg| arg == "--self-test") {
                if let Some(window) = app.get_webview_window("main") {
                    window.eval(
                        "window.location.replace(window.location.pathname + '?selftest=1')",
                    )?;
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            let name = match event {
                tauri::WindowEvent::Resized(_) => Some("resize"),
                tauri::WindowEvent::Moved(_) => Some("move"),
                tauri::WindowEvent::Focused(true) => Some("focus"),
                tauri::WindowEvent::Focused(false) => Some("blur"),
                _ => None,
            };
            if let Some(name) = name {
                let _ = window.emit("platform-event", name);
            }
        })
        .run(tauri::generate_context!())
        .expect("LumaWindow could not start");
}
