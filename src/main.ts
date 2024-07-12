import * as actionsCore from '@actions/core';
import { integrate, UserEmail, UserName } from './integrate';
import { InputNames } from './statics';

function parseBooleanInput(key: string): boolean {
    return actionsCore.getInput(key) === 'true';
}

async function run(): Promise<void> {
    try {
        const branchPattern = new RegExp(
            actionsCore.getInput(InputNames.branchPattern)
        );
        const createBaseIfMissing = parseBooleanInput(
            InputNames.createBaseIfMissing
        );
        const shouldDeleteSource = parseBooleanInput(InputNames.deleteSource);
        const abortIntegrationIfDifferentCommitsOnOrigin = parseBooleanInput(
            InputNames.abortIfDifferentCommitsOnOrigin
        );
        const userEmail = actionsCore.getInput(
            InputNames.gitUserEmail
        ) as UserEmail;
        const userName = actionsCore.getInput(
            InputNames.gitUserName
        ) as UserName;

        actionsCore.notice(
            await integrate(branchPattern, {
                createBaseIfMissing,
                shouldDeleteSource,
                abortIntegrationIfDifferentCommitsOnOrigin,
                userEmail,
                userName,
            })
        );
    } catch (error) {
        if (error instanceof Error) actionsCore.setFailed(error.message);
    }
}

run();
