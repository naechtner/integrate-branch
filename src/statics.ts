export enum InputNames {
    branchPattern = 'branch-pattern',
    createBaseIfMissing = 'create-base-if-missing',
    deleteSource = 'delete-source',
    abortIfDifferentCommitsOnOrigin = 'abort-integration-if-different-commits-on-origin',
    gitUserEmail = 'git-user-email',
    gitUserName = 'git-user-name',
}

export enum OutputNames {
    integrationTarget = 'integration-target',
    didIntegrate = 'did-integrate',
    abortionReason = 'abortion-reason',
    deletedSource = 'deleted-source',
    createdBase = 'created-base',
}

export enum AbortionReasons {
    noTarget = 'no-integration-target-found',
    originAhead = 'newer-commits-on-origin',
}
