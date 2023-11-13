# vscode-kasten-tools README

VSCODE extention for Kasten. Allows request and manage K10 object using kubernetes extention page

## Features

- Show list of policies with attached artifacts
- Add custom artifact by ID/Filtering condition
- Get JSON representation by clicking on the node
- Debug service by port-forwarding all other services and generating env vars

## Requirements

Requirements:
   [Kubernetes extention](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.vscode-kubernetes-tools)

Build:

- vsce package

Installation:

- Download release
- Run
  - npm install -g vsce
  - code --install-extension vscode-kasten-tools-0.0.1.vsix
