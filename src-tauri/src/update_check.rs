//! Notices when a newer build of Inkwell replaces the running one
//! (DESIGN_SPEC §7.12). On macOS the running app keeps its old code until it
//! is restarted, so the frontend asks on window focus and offers Relaunch.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, State};

/// An executable's identity on disk: its file id and modification time.
/// Replacing the file changes at least one of them.
#[derive(Debug, PartialEq, Eq)]
#[cfg_attr(not(unix), allow(dead_code))]
struct ExeIdentity {
    inode: u64,
    mtime_ns: i128,
}

#[cfg(unix)]
fn identity(path: &Path) -> Option<ExeIdentity> {
    use std::os::unix::fs::MetadataExt;

    let metadata = std::fs::metadata(path).ok()?;
    Some(ExeIdentity {
        inode: metadata.ino(),
        mtime_ns: i128::from(metadata.mtime()) * 1_000_000_000 + i128::from(metadata.mtime_nsec()),
    })
}

/// A running executable cannot be replaced on Windows, so there is nothing to notice.
#[cfg(not(unix))]
fn identity(_path: &Path) -> Option<ExeIdentity> {
    None
}

/// The app's executable as it was at launch.
pub struct LaunchedExe {
    path: PathBuf,
    identity: Option<ExeIdentity>,
}

impl LaunchedExe {
    /// Records the running executable. Call once, at launch.
    pub fn record() -> Self {
        Self::at(std::env::current_exe().unwrap_or_default())
    }

    fn at(path: PathBuf) -> Self {
        let identity = identity(&path);
        Self { path, identity }
    }

    /// A token naming the build now at the launch path, if it has replaced
    /// the running one. A missing or unreadable file counts as not replaced.
    fn replacement(&self) -> Option<String> {
        let launched = self.identity.as_ref()?;
        let now = identity(&self.path)?;
        (now != *launched).then(|| format!("{}-{}", now.inode, now.mtime_ns))
    }
}

/// Whether a newer build has replaced the running one: a token unique to that
/// build, or `None`.
#[tauri::command]
pub fn installed_update(exe: State<'_, LaunchedExe>) -> Result<Option<String>, String> {
    Ok(exe.replacement())
}

/// Restarts the app, which starts the executable now at its path: the new
/// build. The frontend saves pending work first.
#[tauri::command]
pub fn relaunch(app: AppHandle) -> Result<(), String> {
    app.restart()
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    /// A fresh file in the temp folder, unique to the test.
    fn temp_file(name: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "inkwell-update-check-{name}-{}",
            std::process::id()
        ));
        std::fs::write(&path, "old build").unwrap();
        path
    }

    #[test]
    fn unchanged_executable_is_not_an_update() {
        let path = temp_file("unchanged");
        let exe = LaunchedExe::at(path.clone());
        assert_eq!(exe.replacement(), None);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn replaced_executable_is_an_update() {
        let path = temp_file("replaced");
        let exe = LaunchedExe::at(path.clone());

        // Installers write the new file beside the old one, then move it into place.
        let new_build = path.with_extension("new");
        std::fs::write(&new_build, "new build").unwrap();
        std::fs::rename(&new_build, &path).unwrap();

        let token = exe.replacement();
        assert!(token.is_some());
        // The same build gives the same token, so the notice shows once per build.
        assert_eq!(exe.replacement(), token);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn missing_executable_is_not_an_update() {
        let path = temp_file("missing");
        let exe = LaunchedExe::at(path.clone());
        std::fs::remove_file(&path).unwrap();
        assert_eq!(exe.replacement(), None);
    }
}
