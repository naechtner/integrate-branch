import { integrate, UserEmail, UserName } from '../src/integrate';
import { expect, it, describe, beforeEach, jest } from '@jest/globals';
import simpleGit, { SimpleGitFactory } from 'simple-git'; // eslint-disable-line import/no-named-as-default, import/named
import { getAllMethodNames, TEST_PATTERN } from './utils';

const DEFAULT_CURRENT_BRANCH = 'integrate_something_someone';

interface GitCommand {
    command: string;
    args?: string[];
}

jest.mock('simple-git');
const actualSimpleGit: { simpleGit: SimpleGitFactory } =
    jest.requireActual('simple-git');
const actualSimpleGitFactory = actualSimpleGit.simpleGit;
const simpleGitMock = simpleGit as jest.Mock;

const GIT_DEFAULT_RETURNS: { [key: string]: Object } = {
    branch: { current: DEFAULT_CURRENT_BRANCH },
};

function git(command: string, ...args: string[]): GitCommand {
    return {
        command,
        args: args.length ? args : undefined,
    };
}

describe('integrate', () => {
    const DEFAULT_CONFIG_PARAMS = {
        abortIntegrationIfDifferentCommitsOnOrigin: false,
        createBaseIfMissing: false,
        shouldDeleteSource: false,
        userName: 'username' as UserName,
        userEmail: 'useremail' as UserEmail,
    };
    const DEFAULT_COMMAND_EXPECTATION = [
        git('branch'),
        git('addConfig', 'user.email', 'useremail'),
        git('addConfig', 'user.name', 'username'),
        git('fetch', 'origin', 'something', '--no-tags'),
        git('branch', 'something', 'origin/something'),
        git(
            'rebase',
            'integrate_something_someone',
            'something',
            '--rebase-merges'
        ),
        git('push', 'origin', 'something', '--set-upstream'),
    ];
    let gitCommands: GitCommand[];
    let gitMockedMethods: Record<string, jest.MockedFunction<() => unknown>>;

    beforeEach(() => {
        gitCommands = [];

        jest.spyOn(console, 'info').mockImplementation(jest.fn());
        setupGitMock();
    });

    function buildBaseMockImplementation(
        method: string,
        implementationCallback?: Function
    ) {
        return async (...args: string[]) => {
            const command: GitCommand = {
                command: method,
            };
            if (args.length > 0) {
                command.args = args.flat();
            }
            gitCommands.push(command);

            return implementationCallback
                ? implementationCallback()
                : GIT_DEFAULT_RETURNS[
                      method as keyof typeof GIT_DEFAULT_RETURNS
                  ];
        };
    }

    function setupGitMock(): void {
        const gitMethodsToMock = getAllMethodNames(actualSimpleGitFactory());
        gitMethodsToMock.push('addConfig');

        gitMockedMethods = gitMethodsToMock.reduce(
            (acc, method) => {
                acc[method] = jest
                    .fn<() => void>()
                    .mockImplementation(buildBaseMockImplementation(method));
                return acc;
            },
            {} as Record<string, jest.MockedFunction<() => unknown>>
        );
        simpleGitMock.mockReturnValue(gitMockedMethods);
    }

    it('runs', async () => {
        const result = await integrate(TEST_PATTERN, DEFAULT_CONFIG_PARAMS);

        expect(gitCommands).toEqual(DEFAULT_COMMAND_EXPECTATION);
        expect(result).toEqual('Branch was integrated');
    });

    it('aborts if the branch does not match the pattern', async () => {
        const integrationSource = 'sourcebranch';
        gitMockedMethods.branch.mockImplementation(
            buildBaseMockImplementation('branch', () => ({
                current: integrationSource,
            }))
        );

        const result = await integrate(TEST_PATTERN, DEFAULT_CONFIG_PARAMS);

        expect(result).toEqual(
            `Current branch does not match branch pattern or "base" group not defined\n\t↳Current branch: ${integrationSource}`
        );
    });

    describe('configuration', () => {
        describe('abortIntegrationIfDifferentCommitsOnOrigin', () => {
            it('aborts if value is true and the commits are not the same', async () => {
                gitMockedMethods.revparse
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'firstCommitHash'
                        )
                    )
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'secondCommitHash'
                        )
                    );

                const result = await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    abortIntegrationIfDifferentCommitsOnOrigin: true,
                });

                expect(result).toEqual(
                    'Branch was not integrated as the origin has been updated in the meantime'
                );
            });

            it('does not abort if value is false and the commits are not the same', async () => {
                gitMockedMethods.revparse
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'firstCommitHash'
                        )
                    )
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'secondCommitHash'
                        )
                    );

                const result = await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    abortIntegrationIfDifferentCommitsOnOrigin: false,
                });

                expect(result).toEqual('Branch was integrated');
            });

            it.each([true, false])(
                'does not abort if value is "%s" and the commits are the same',
                async (abortIntegrationIfDifferentCommitsOnOrigin) => {
                    gitMockedMethods.revparse.mockReturnValue('commitHash');

                    const result = await integrate(TEST_PATTERN, {
                        ...DEFAULT_CONFIG_PARAMS,
                        abortIntegrationIfDifferentCommitsOnOrigin,
                    });

                    expect(result).toEqual('Branch was integrated');
                }
            );
        });

        describe('createBaseIfMissing', () => {
            it('creates base if missing if feature flag is true', async () => {
                gitMockedMethods.fetch.mockImplementationOnce(
                    buildBaseMockImplementation('fetch', () => {
                        throw new Error('some error');
                    })
                );

                const result = await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    createBaseIfMissing: true,
                });

                expect(gitCommands).toEqual([
                    git('branch'),
                    git('addConfig', 'user.email', 'useremail'),
                    git('addConfig', 'user.name', 'username'),
                    git('fetch', 'origin', 'something', '--no-tags'),
                    git('branch', 'something'),
                    git(
                        'rebase',
                        'integrate_something_someone',
                        'something',
                        '--rebase-merges'
                    ),
                    git('push', 'origin', 'something', '--set-upstream'),
                ]);
                expect(result).toEqual('Branch was integrated');
            });

            it.each([true, false])(
                'does not create base if not missing if feature flag is "%s"',
                async (createBaseIfMissing) => {
                    const result = await integrate(TEST_PATTERN, {
                        ...DEFAULT_CONFIG_PARAMS,
                        createBaseIfMissing,
                    });

                    expect(gitCommands).toEqual(DEFAULT_COMMAND_EXPECTATION);
                    expect(result).toEqual('Branch was integrated');
                }
            );

            it('aborts if it is missing if feature flag is false', async () => {
                const error = 'Not found';

                gitMockedMethods.fetch.mockImplementationOnce(
                    buildBaseMockImplementation('fetch', () => {
                        throw new Error(error);
                    })
                );

                expect(async () => {
                    await integrate(TEST_PATTERN, {
                        ...DEFAULT_CONFIG_PARAMS,
                        createBaseIfMissing: false,
                    });
                }).rejects.toThrowError(error);

                expect(gitCommands).toEqual([git('branch')]);
            });
        });

        describe('shouldDeleteSource', () => {
            it('deletes source if flag is true and remote branch is not ahead', async () => {
                const result = await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    shouldDeleteSource: true,
                });

                expect(gitCommands).toEqual([
                    git('branch'),
                    git('addConfig', 'user.email', 'useremail'),
                    git('addConfig', 'user.name', 'username'),
                    git('fetch', 'origin', 'something', '--no-tags'),
                    git('branch', 'something', 'origin/something'),
                    git(
                        'rebase',
                        'integrate_something_someone',
                        'something',
                        '--rebase-merges'
                    ),
                    git('fetch', DEFAULT_CURRENT_BRANCH),
                    git('revparse', DEFAULT_CURRENT_BRANCH),
                    git('revparse', `origin/${DEFAULT_CURRENT_BRANCH}`),
                    git(
                        'push',
                        'origin',
                        'integrate_something_someone',
                        '--delete'
                    ),
                    git('push', 'origin', 'something', '--set-upstream'),
                ]);
                expect(console.info).toHaveBeenCalledWith(
                    `Deleting "${DEFAULT_CURRENT_BRANCH}" on "origin"`
                );
                expect(result).toEqual('Branch was integrated');
            });

            it('does not delete source if flag is true and remote branch is ahead', async () => {
                gitMockedMethods.revparse
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'first commit hash'
                        )
                    )
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'second commit hash'
                        )
                    );

                const result = await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    shouldDeleteSource: true,
                });

                expect(gitCommands).toEqual([
                    git('branch'),
                    git('addConfig', 'user.email', 'useremail'),
                    git('addConfig', 'user.name', 'username'),
                    git('fetch', 'origin', 'something', '--no-tags'),
                    git('branch', 'something', 'origin/something'),
                    git(
                        'rebase',
                        'integrate_something_someone',
                        'something',
                        '--rebase-merges'
                    ),
                    git('fetch', DEFAULT_CURRENT_BRANCH),
                    git('revparse', DEFAULT_CURRENT_BRANCH),
                    git('revparse', `origin/${DEFAULT_CURRENT_BRANCH}`),
                    git('push', 'origin', 'something', '--set-upstream'),
                ]);
                expect(result).toEqual('Branch was integrated');
            });

            it('does not delete source if flag is false and remote branch is ahead', async () => {
                gitMockedMethods.revparse
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'first commit hash'
                        )
                    )
                    .mockImplementationOnce(
                        buildBaseMockImplementation(
                            'revparse',
                            () => 'second commit hash'
                        )
                    );

                const result = await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    shouldDeleteSource: false,
                });

                expect(gitCommands).toEqual(DEFAULT_COMMAND_EXPECTATION);
                expect(result).toEqual('Branch was integrated');
            });

            it('does not delete source if flag is false and remote branch is ahead', async () => {
                const result = await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    shouldDeleteSource: false,
                });

                expect(gitCommands).toEqual(DEFAULT_COMMAND_EXPECTATION);
                expect(result).toEqual('Branch was integrated');
            });
        });

        describe('username & email', () => {
            it('sets username if passed', async () => {
                await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    userName: 'myUsername' as UserName,
                });

                expect(gitCommands).toContainEqual(
                    git('addConfig', 'user.name', 'myUsername')
                );
            });

            it('does not set username if not passed', async () => {
                await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    userName: '' as UserName,
                });

                expect(
                    gitCommands.filter(
                        (command) =>
                            command.command === 'addConfig' &&
                            command.args?.[0] === 'user.name'
                    )
                ).toEqual([]);
            });

            it('sets email if passed', async () => {
                await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    userName: 'myUserName' as UserName,
                });

                expect(gitCommands).toContainEqual(
                    git('addConfig', 'user.name', 'myUserName')
                );
            });

            it('does not set email if not passed', async () => {
                await integrate(TEST_PATTERN, {
                    ...DEFAULT_CONFIG_PARAMS,
                    userEmail: '' as UserEmail,
                });

                expect(
                    gitCommands.filter(
                        (command) =>
                            command.command === 'addConfig' &&
                            command.args?.[0] === 'user.email'
                    )
                ).toEqual([]);
            });
        });
    });
});
