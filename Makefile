.PHONY: help setup dev kill-port build package publish publish-rc publish-dry clean clean-dist preview test test-e2e test-e2e-ui test-e2e-headed test-e2e-install lint image-build image-run image-stop image-clean

# Use bash-compatible commands for Git Bash on Windows
SHELL := /bin/bash

# Per-developer overrides (container runner, image name, port). Optional: the
# leading `-` means it's fine if the file is absent. Defaults below apply when a
# value isn't set, so `image-*` works out of the box. Copy or edit .makefile.env
# to switch the runner (e.g. DOCKER_RUNNER = docker).
-include .makefile.env
DOCKER_RUNNER  ?= podman
IMAGE_NAME     ?= registry.km8.es/web-daterangepicker-examples:prod
CONTAINER_NAME ?= web-daterangepicker-examples
IMAGE_PORT     ?= 12310

help: ## Show this help message
	@echo "Available targets:"
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

setup: ## Install dependencies and prepare project
	@echo "Installing dependencies..."
	npm install
	@echo "Setup complete"

dev: ## Start development server with hot reload
	@echo "Starting development server..."
	@rm -rf node_modules/.vite
	npm run dev

# Free the vite dev-server ports. Vite starts at 12300 and hops to the next free
# port when one is busy, so a stale run can hold any of 12300-12305. Kills whatever
# is LISTENING on those ports, covering both IPv4 and IPv6 (vite binds [::1] too).
# Recipes here run under Git Bash (SHELL := /bin/bash), so the sh recipe calls the
# Windows netstat/taskkill directly.
kill-port: ## Free the vite dev-server ports (12300-12305)
	@echo "Freeing ports 12300-12305..."
ifeq ($(OS),Windows_NT)
	-@netstat -ano | grep -E ':1230[0-5][^0-9]' | grep LISTENING | awk '{print $$5}' | sort -u | while read pid; do MSYS_NO_PATHCONV=1 taskkill /F /PID $$pid; done
else
	-@for p in 12300 12301 12302 12303 12304 12305; do lsof -ti tcp:$$p | xargs -r kill -9; done
endif
	@echo "Ports 12300-12305 are free"

build: ## Build for production
	@echo "Building for production..."
	npm run build
	@echo "Build complete - Files in ./dist"

package: build ## Create npm package (tarball)
	@echo "Creating package..."
	npm pack
	@echo "Package created successfully"

publish-dry: build ## Publish to npm (dry run)
	@echo "Running publish dry-run..."
	npm publish --dry-run
	@echo "Dry-run complete - Review the output above"

publish: clean-dist build ## Publish to npm (latest tag)
	@echo "WARNING: This will publish to npm registry as 'latest'"
	@echo "Press Enter to continue (Ctrl+C to cancel)..."
	@read -r
	@echo "Publishing to npm..."
	npm publish
	@echo "Published successfully"

publish-rc: clean-dist build ## Publish to npm under the 'rc' dist-tag (keeps 'latest' untouched)
	@echo "WARNING: This will publish to npm registry under the 'rc' dist-tag"
	@echo "(consumers running 'npm install' will NOT pick this up; they opt in via @rc)"
	@echo "Press Enter to continue (Ctrl+C to cancel)..."
	@read -r
	@echo "Publishing to npm with --tag rc..."
	npm publish --tag rc
	@echo "Published successfully under the 'rc' dist-tag"

clean: ## Clean build artifacts and node_modules
	@echo "Cleaning build artifacts..."
	rm -rf dist node_modules *.tgz
	@echo "Clean complete"

clean-dist: ## Clean only dist folder
	@echo "Cleaning dist folder..."
	rm -rf dist
	@echo "Dist cleaned"

preview: build ## Preview production build
	@echo "Starting preview server..."
	npm run preview

lint: ## Run linter (if configured)
	@echo "Linting is not configured yet"
	@echo "Consider adding ESLint in the future"

test: test-e2e ## Run the test suite (alias for test-e2e)

test-e2e: ## Run Playwright e2e tests (headless)
	@echo "Running e2e tests..."
	npm run test:e2e

test-e2e-ui: ## Run Playwright e2e tests in interactive UI mode
	npm run test:e2e:ui

test-e2e-headed: ## Run Playwright e2e tests headed (watch the browser)
	npm run test:e2e:headed

test-e2e-install: ## One-time: install the chromium browser binary for Playwright
	npm run test:e2e:install

check-version: ## Show current package version
	@echo "Current version:"
	@node -p "require('./package.json').version"

update-deps: ## Update dependencies
	@echo "Updating dependencies..."
	npm update
	@echo "Dependencies updated"

install-dev: ## Install as local dev dependency (for testing)
	@echo "Installing package locally..."
	npm pack
	@echo "Package created - Look for keenmate-web-daterangepicker-*.tgz file"
	@echo "Install in another project with: npm install <path-to-tgz>"

# ── Container image (examples site) ──────────────────────────────────────────
# Runner is configurable via .makefile.env (DOCKER_RUNNER); defaults to podman.

image-build: ## Build the examples container image (build + serve stages)
	@echo "Building $(IMAGE_NAME) with $(DOCKER_RUNNER)..."
	$(DOCKER_RUNNER) build -t $(IMAGE_NAME) .
	@echo "Image built: $(IMAGE_NAME)"

image-run: ## Run the examples image (serves on IMAGE_PORT, default 12310)
	@echo "Starting $(CONTAINER_NAME) on http://localhost:$(IMAGE_PORT) ..."
	-@$(DOCKER_RUNNER) rm -f $(CONTAINER_NAME) >/dev/null 2>&1
	$(DOCKER_RUNNER) run -d --name $(CONTAINER_NAME) -p $(IMAGE_PORT):80 $(IMAGE_NAME)
	@echo "Serving examples at http://localhost:$(IMAGE_PORT)"

image-stop: ## Stop and remove the examples container
	@echo "Stopping $(CONTAINER_NAME)..."
	-@$(DOCKER_RUNNER) rm -f $(CONTAINER_NAME) >/dev/null 2>&1
	@echo "Stopped"

image-clean: image-stop ## Remove the examples container and image
	@echo "Removing image $(IMAGE_NAME)..."
	-@$(DOCKER_RUNNER) rmi $(IMAGE_NAME) >/dev/null 2>&1
	@echo "Image removed"

# Default target
.DEFAULT_GOAL := help
