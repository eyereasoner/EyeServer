test:
	@./node_modules/.bin/vows

jshint:
	@jshint lib bin

.PHONY: test jshint
