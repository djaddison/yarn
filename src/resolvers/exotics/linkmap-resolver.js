/* @flow */

import type {Manifest} from '../../types.js';
import type PackageRequest from '../../package-request.js';
import ExoticResolver from './exotic-resolver.js';
import {MessageError} from '../../errors.js';
import {LINKMAP_FILENAME} from '../../constants';
import * as util from '../../util/misc.js';
import * as fs from '../../util/fs.js';
import path from 'path';

export const LINKMAP_PROTOCOL_PREFIX = 'linkmap:';

export default class MappedResolver extends ExoticResolver {
  constructor(request: PackageRequest, fragment: string) {
    super(request, fragment);
    this.linkKey = util.removePrefix(fragment, LINKMAP_PROTOCOL_PREFIX);
  }

  linkKey: string;

  static protocol = 'linkmap';

  async resolve(): Promise<Manifest> {
    let manifest: Manifest;
    const linkMapPath = path.join(this.config.lockfileFolder, LINKMAP_FILENAME);
    const linkMapBuffer = await fs.readFileBuffer(linkMapPath);
    const linkMap = JSON.parse(linkMapBuffer.toString());
    const linkKey = this.linkKey;
    const linkPath = linkMap[linkKey];

    if (!linkPath) {
      throw new MessageError(`Unable to find package mapping for ${linkKey}`);
    }

    if (await fs.exists(`${linkPath}/package.json`)) {
      manifest = await this.config.readManifest(linkPath);
    } else {
      throw new MessageError(`Unable to read package.json for ${linkKey} package mapping`);
    }

    manifest._remote = {
      type: 'link',
      registry: 'npm',
      hash: null,
      reference: linkPath,
    };
    manifest._uid = manifest.version;

    return manifest;
  }
}
