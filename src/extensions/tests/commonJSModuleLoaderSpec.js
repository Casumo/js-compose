/* eslint no-unused-expressions: 0, max-nested-callbacks: 0 */
/* eslint-env mocha */

import path from 'path';
import { containerDoubles } from '../../../test/doubles';
import { addSpecsForCanLoadModule } from '../../../test/moduleLoaders';
import CommonJSModuleLoader from '../CommonJSModuleLoader';

describe('CommonJSModuleLoader', () => {

    let loader;

    beforeEach(() => {
        loader = new CommonJSModuleLoader(
            require.context('../../', true)
        );
    });

    addSpecsForCanLoadModule('commonJS', () => loader);

    describe('loadModule', () => {

        it('should return a promise for the module in the definition', () => {

            const extensionApi = containerDoubles.extensionApi({
                serviceDefinition: {
                    commonJS: 'extensions/CommonJSModuleLoader'
                }
            });

            const expected = require('../CommonJSModuleLoader');

            return loader.loadModule(extensionApi).should.eventually.equal(expected);

        });

        it('should support dot notation to return a specific export from the module', () => {

            const extensionApi = containerDoubles.extensionApi({
                serviceDefinition: {
                    commonJS: 'extensions/CommonJSModuleLoader.default'
                }
            });

            const expected = require('../CommonJSModuleLoader').default;

            return loader.loadModule(extensionApi).should.eventually.equal(expected);

        });

    });

});
