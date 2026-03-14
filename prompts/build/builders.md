# Builders

Use this prompt when planning build or execution verification.

Repository-level norms:
- root build runs through workspace scripts
- app/package-specific build commands may also be required
- changes touching shared modules can require app builds and package builds together

When documenting build verification:
- name the exact commands to run
- include both target-app checks and shared-module checks when relevant
- keep the verification list scoped to the touched ownership boundaries
