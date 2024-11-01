.PHONY:prepare
prepare:
	npm run prepare

PHONY: updatecli-diff
updatecli-diff:  ## Run updatecli in diff mode
	updatecli compose diff

PHONY: updatecli-apply
updatecli-apply:  ## Run updatecli in apply mode
	updatecli compose apply

PHONY: updatecli-show
updatecli-show: ## Run updatecli in show mode
	updatecli compose show
