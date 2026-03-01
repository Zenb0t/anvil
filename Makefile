SHELL := /bin/sh

.PHONY: install uninstall

install:
	@sh scripts/install.sh install

uninstall:
	@sh scripts/install.sh uninstall
