test:
	@./node_modules/.bin/vows

jshint:
	@./node_modules/jshint/bin/hint lib bin

.PHONY: test jshint
