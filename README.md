# Integrate branch

<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

## About

This Github action helps you to merge or rebase changes onto a certain branch after the required CI checks have passed.


## How to use

- Requires repo write rights.
- Add this to your main workflow and require the necessary actions as dependencies.
- Checkout the repository
- Call this action with the proper parameters for your use case

For an example see the [integrate step](.github/workflows/test.yml).
For all of the parameters see [action.yml](action.yml)

Consider adding the following command to your git aliases:

```integration = "!git push --force origin HEAD:refs/heads/integrate_$(git rev-parse --symbolic-full-name --abbrev-ref HEAD)_someone";```

If you always want to fetch first consider doing it with an initial "rebase pull" this will be your desired alias:

```integration = "!git pull --rebase && git push --force origin HEAD:refs/heads/integrate_$(git rev-parse --symbolic-full-name --abbrev-ref HEAD)_someone";```

## Known issues

- Changes to actions will fail the action
- A follow up pipeline will not be triggered

Both of these are by design from Github and can be bypassed using a private/app access token during the setup

## How to run the tests

- Run `npm install`
- Run `npm run test`


## Create new release

[Create a versioned (v1) tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference a stable and latest action.
