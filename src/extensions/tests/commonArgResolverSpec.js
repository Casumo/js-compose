/* eslint no-unused-expressions: 0, max-nested-callbacks: 0 */
/* eslint-env mocha */

import { _ } from '../../globals';
import { containerDoubles } from '../../../test/doubles';
import CommonArgResolver from '../CommonArgResolver';

describe('CommonArgResolver', () => {

    let argResolver;

    beforeEach(() => {
        argResolver = new CommonArgResolver();
    });

    it('should not resolve unsupported args', () => {

        argResolver.canResolveArg('').should.equal(false);
        argResolver.canResolveArg('@foo').should.equal(false);
        argResolver.canResolveArg(123).should.equal(false);

    });

    it('should expose the container', () => {

        const extensionApi = containerDoubles.extensionApi();

        argResolver.canResolveArg('container').should.equal(true);

        // eslint-disable-next-line max-len
        return argResolver.resolveArg('container', extensionApi).should.eventually.equal(extensionApi.container);

    });

    it('should expose empty string', () => {

        argResolver.canResolveArg('emptyString').should.equal(true);

        return argResolver.resolveArg('emptyString', {}).should.eventually.equal('');

    });

    it('should expose true', () => {

        argResolver.canResolveArg('true').should.equal(true);

        return argResolver.resolveArg('true', {}).should.eventually.equal(true);

    });

    it('should expose false', () => {

        argResolver.canResolveArg('false').should.equal(true);

        return argResolver.resolveArg('false', {}).should.eventually.equal(false);

    });

    it('should expose noop', () => {

        argResolver.canResolveArg('noop').should.equal(true);

        return argResolver.resolveArg('noop', {}).should.eventually.equal(_.noop);

    });

});
