/* eslint no-unused-expressions: 0, max-nested-callbacks: 0 */
/* eslint-env mocha */

import { containerDoubles } from '../../../test/doubles';
import { addSpecsForCanResolveArgMatchingPrefix } from '../../../test/argResolvers';
import ServiceArgResolver from '../ServiceArgResolver';

describe('ServiceArgResolver', () => {

    let argResolver;

    beforeEach(() => {
        argResolver = new ServiceArgResolver();
    });

    addSpecsForCanResolveArgMatchingPrefix('@', () => argResolver);

    describe('resolveArg', () => {

        it('should return a promise for the service from the container', () => {

            const extensionApi = containerDoubles.extensionApi();
            const service = {};

            extensionApi.container.get.withArgs('foo').resolves(service);

            return argResolver.resolveArg('@foo', extensionApi).should.eventually.equal(service);

        });

        it('should return a promise for nested properties of the service', () => {

            const extensionApi = containerDoubles.extensionApi();
            const nested = {};
            const service = {
                bar: {
                    abc: nested
                }
            };

            extensionApi.container.get.withArgs('foo').resolves(service);

            return argResolver.resolveArg('@foo.bar.abc', extensionApi).should.eventually.equal(nested);

        });

    });

    describe('lintArg', () => {

        it('should return an empty array if a matching service exists', () => {

            const extensionApi = containerDoubles.extensionApi();

            extensionApi.container.config.services.foo = {};

            return argResolver.lintArg('@foo', extensionApi).should.eventually.deep.equal([]);

        });

        it('should support service args with dot notation', () => {

            const extensionApi = containerDoubles.extensionApi();

            extensionApi.container.config.services.foo = {};

            return argResolver.lintArg('@foo.bar.abc', extensionApi).should.eventually.deep.equal([]);

        });

        it('should return an error if there is no matching service', () => {

            const extensionApi = containerDoubles.extensionApi();

            return argResolver.lintArg('@foo', extensionApi).then((errors) => {
                errors.length.should.equal(1);
                errors[0].should.contain('foo');
            });

        });

    });

});
