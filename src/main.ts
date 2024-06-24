import * as core from '@actions/core';
import { integrate, UserEmail, UserName } from './integrate';

function parseBooleanInput(key: string): boolean {
    return core.getInput(key) === 'true';
}

async function run(): Promise<void> {
    try {
        const branchPattern = new RegExp(core.getInput('branch-pattern'));
        const createBaseIfMissing = parseBooleanInput('create-base-if-missing');
        const shouldDeleteSource = parseBooleanInput('delete-source');
        const abortIntegrationIfDifferentCommitsOnOrigin = parseBooleanInput(
            'abort-integration-if-newer-commits-on-origin'
        );
        const userEmail = core.getInput('git-user-email') as UserEmail;
        const userName = core.getInput('git-user-name') as UserName;

        core.info(
            await integrate(branchPattern, {
                createBaseIfMissing,
                shouldDeleteSource,
                abortIntegrationIfDifferentCommitsOnOrigin,
                userEmail,
                userName,
            })
        );
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message);
    }
}

run();
