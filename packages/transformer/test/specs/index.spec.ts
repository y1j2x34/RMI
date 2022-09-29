import { loadFixtures, loadSpecialFixtures } from '../common/load-fixture';
import transformer from '../../src';
import { transpile } from '../common/compiler';

interface TestCase {
    source: string;
    filepath: string;
    name: string;
    only?: boolean;
    skip?: boolean;
}

interface SpecialFixture {
    file: string;
    name: string;
    only?: boolean;
    skip?: boolean;
}

describe('@vgerbot/channel-transformer', () => {
    const specialFixtures: SpecialFixture[] = [
        {
            file: 'normal',
            name: 'should run normally with the transformer',
        },
        {
            file: 'alias',
            name: 'should be able to detect the module alias',
        },
        {
            file: 'exclude 2 arguments',
            name: 'should be able to exclude methods calling that has more than 2 arguments',
        },
        {
            file: 'exclude without type arguments',
            name: 'should be able to exclude methods without type arguments',
        },
        {
            file: 'reference class',
            name: 'should be able to reference the class',
        },
        {
            file: 'reuse converted variables',
            name: 'should reuse converted variables',
        },
    ];

    specialFixtures
        .map((it) => {
            return {
                source: loadSpecialFixtures(it.file).source,
                filepath: `fixtures/special/${it.file}.ts`,
                name: it.name,
                only: it.only,
                skip: it.skip,
            } as TestCase;
        })
        .concat(
            loadFixtures().map((it) => {
                return {
                    source: it.source,
                    filepath: it.filepath,
                    name: `should transform "${it.filepath}" correctly`,
                    only: false,
                    skip: false,
                };
            })
        )
        .forEach(({ filepath, source, name, only, skip }) => {
            const callback: jest.ProvidesCallback = () => {
                const output = transpile(filepath, source, {
                    channelTransformer: transformer,
                });
                expect(output).toMatchSnapshot();
            };
            if (only) {
                it.only(name, callback);
            } else if (skip) {
                it.skip(name, callback);
            } else {
                it(name, callback);
            }
        });
});
