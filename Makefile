SHELL := /bin/sh

PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
ANVIL_SRC := $(CURDIR)/bin/anvil
ANVIL_DEST := $(BINDIR)/anvil

.PHONY: install uninstall

install:
	@mkdir -p "$(BINDIR)"
	@MSYS=winsymlinks:lnk ln -sfn "$(ANVIL_SRC)" "$(ANVIL_DEST)"
	@chmod +x "$(ANVIL_SRC)"
	@echo "Installed $(ANVIL_DEST) -> $(ANVIL_SRC)"

uninstall:
	@if [ -e "$(ANVIL_DEST)" ] || [ -L "$(ANVIL_DEST)" ]; then \
		rm -f "$(ANVIL_DEST)"; \
		echo "Removed $(ANVIL_DEST)"; \
	else \
		echo "No install found at $(ANVIL_DEST)"; \
	fi
