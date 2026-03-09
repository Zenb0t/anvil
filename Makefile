SHELL := /bin/sh

.PHONY: install validate status

install:
	npm install

validate:
	npx openspec validate --all --json

status:
	npx openspec status --json
