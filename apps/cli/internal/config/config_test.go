package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSetCreatesFileWithMode0600(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "atlas", "config.toml")

	if err := Set(path, "server", "http://example.test"); err != nil {
		t.Fatalf("Set failed: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Errorf("file mode = %o, want 0600", info.Mode().Perm())
	}
	// Parent directory was created.
	pInfo, err := os.Stat(filepath.Dir(path))
	if err != nil {
		t.Fatalf("stat dir: %v", err)
	}
	if !pInfo.IsDir() {
		t.Errorf("parent is not a directory")
	}
}

func TestLoadDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "missing.toml")

	v := New(path)
	cfg, err := Load(v)
	if err != nil {
		t.Fatalf("Load returned error on missing file: %v", err)
	}
	if cfg.Server != DefaultServer {
		t.Errorf("default server = %q, want %q", cfg.Server, DefaultServer)
	}
	if cfg.Timeout != DefaultTimeout {
		t.Errorf("default timeout = %v, want %v", cfg.Timeout, DefaultTimeout)
	}
}

func TestPrecedenceEnvOverridesFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	if err := Set(path, "server", "http://file"); err != nil {
		t.Fatalf("Set: %v", err)
	}

	t.Setenv("ATLAS_SERVER", "http://env")
	v := New(path)
	cfg, err := Load(v)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Server != "http://env" {
		t.Errorf("env precedence failed: got %q", cfg.Server)
	}
}

func TestSetUnknownKey(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "c.toml")
	err := Set(path, "bogus", "x")
	if err == nil {
		t.Fatal("expected error for unknown key")
	}
}
