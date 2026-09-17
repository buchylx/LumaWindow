fn main() {
    println!("cargo:rerun-if-changed=src/macos_lifecycle.m");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        cc::Build::new()
            .file("src/macos_lifecycle.m")
            .flag("-fobjc-arc")
            .compile("lumawindow_lifecycle");
        println!("cargo:rustc-link-lib=framework=AppKit");
        println!("cargo:rustc-link-lib=framework=Foundation");
    }
    tauri_build::build()
}
