{
  description = "A Github action to rebase or merge branches following a specified pattern onto their respective base branch ";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in rec
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.pre-commit
            pkgs.nodejs-slim_21
          ];
        };
        shellHook = ''
          pre-commit install
        '';
      }
    );
}
