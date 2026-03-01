SHELL := /bin/sh

PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
ANVIL_DEST := $(BINDIR)/anvil

.PHONY: install uninstall

install:
	@anvil_src="$$(pwd)/bin/anvil"; \
	mkdir -p "$(BINDIR)"; \
	rm -f "$(ANVIL_DEST)"; \
	MSYS=winsymlinks:lnk ln -s "$$anvil_src" "$(ANVIL_DEST)"; \
	echo "Installed $(ANVIL_DEST) -> $$anvil_src"

uninstall:
	@anvil_src="$$(pwd)/bin/anvil"; \
	if [ -L "$(ANVIL_DEST)" ] && [ "$$(readlink "$(ANVIL_DEST)")" = "$$anvil_src" ]; then \
		rm -f "$(ANVIL_DEST)"; \
		echo "Removed $(ANVIL_DEST)"; \
	elif [ -e "$(ANVIL_DEST)" ] || [ -L "$(ANVIL_DEST)" ]; then \
		echo "Refusing to remove non-managed target $(ANVIL_DEST)" >&2; \
		exit 1; \
	else \
		echo "No install found at $(ANVIL_DEST)"; \
	fi
