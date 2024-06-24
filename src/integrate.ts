import * as simpleGit from 'simple-git';

type IntegrationSource = string & { readonly __unique: unique symbol };
type IntegrationTarget = string & { readonly __unique: unique symbol };
export type UserEmail = string & { readonly __unique: unique symbol };
export type UserName = string & { readonly __unique: unique symbol };

interface IntegrationOptions {
    createBaseIfMissing: boolean;
    shouldDeleteSource: boolean;
    abortIntegrationIfDifferentCommitsOnOrigin: boolean;
    userEmail: UserEmail;
    userName: UserName;
}

async function checkIfIntegrationTargetExistsAndCreate(
    git: simpleGit.SimpleGit,
    integrationTarget: string,
    createBaseIfMissing: boolean
): Promise<void> {
    try {
        console.info(`Fetching "${integrationTarget}"`);
        await git.fetch('origin', integrationTarget, ['--no-tags']);
        console.info(`Creating local branch "${integrationTarget}"`);
        await git.branch([integrationTarget, `origin/${integrationTarget}`]);
    } catch (e) {
        if (createBaseIfMissing) {
            console.info("Couldn't find integration target, creating it");
            git.branch([integrationTarget]);
        } else {
            console.info("Couldn't find integration target, aborting");
            throw e;
        }
    }
}

async function setUserData(
    git: simpleGit.SimpleGit,
    userEmail: UserEmail,
    userName: UserName
): Promise<void> {
    if (userEmail) {
        await git.addConfig('user.email', userEmail);
    }

    if (userName) {
        await git.addConfig('user.name', userName);
    }
}

async function isRemoteTheSame(
    git: simpleGit.SimpleGit,
    branch: IntegrationSource | IntegrationTarget
): Promise<boolean> {
    await git.fetch(branch);
    const currentCommitHash = await git.revparse(branch);
    const remoteCommitHash = await git.revparse(`origin/${branch}`);

    return currentCommitHash === remoteCommitHash;
}

async function conditionallyDeleteSource(
    git: simpleGit.SimpleGit,
    integrationSource: IntegrationSource,
    shouldDeleteSource: boolean
): Promise<void> {
    if (
        !shouldDeleteSource ||
        !(await isRemoteTheSame(git, integrationSource))
    ) {
        return;
    }

    console.info(`Deleting "${integrationSource}" on "origin"`);
    await git.push('origin', integrationSource, ['--delete']);
}

export async function integrate(
    branchPattern: RegExp,
    {
        createBaseIfMissing,
        shouldDeleteSource,
        abortIntegrationIfDifferentCommitsOnOrigin,
        userEmail,
        userName,
    }: IntegrationOptions
): Promise<string> {
    const git = simpleGit.simpleGit();
    const integrationSource = (await git.branch()).current as IntegrationSource;

    const match = integrationSource.match(branchPattern);
    const integrationTarget = match?.groups?.base as
        | IntegrationTarget
        | undefined;
    if (!integrationTarget) {
        return `Current branch does not match branch pattern or "base" group not defined\n\t↳Current branch: ${integrationSource}`;
    }

    if (
        abortIntegrationIfDifferentCommitsOnOrigin &&
        !(await isRemoteTheSame(git, integrationSource))
    ) {
        return 'Branch was not integrated as the origin has been updated in the meantime';
    }

    console.info(
        `Integrating "${integrationSource}" into "${integrationTarget}"`
    );

    await setUserData(git, userEmail, userName);
    await checkIfIntegrationTargetExistsAndCreate(
        git,
        integrationTarget,
        createBaseIfMissing
    );

    console.info(`Rebasing "${integrationSource}" onto "${integrationTarget}"`);
    await git.rebase([integrationSource, integrationTarget, '--rebase-merges']);

    await conditionallyDeleteSource(git, integrationSource, shouldDeleteSource);

    console.info(`Pushing "${integrationTarget}" to "origin"`);
    await git.push('origin', integrationTarget, ['--set-upstream']);

    return 'Branch was integrated';
}
