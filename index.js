'use strict';

const path = require('path');
const through = require('through2');
const vinylFile = require('vinyl-file');
const modifyFilename = require('modify-filename');
const Vinyl = require('vinyl');
const PluginError = require('plugin-error');
const exec = require('child_process').exec;

/**
 * Executes a shell command.
 * @param {*} cmd
 * @param {*} cb
 */
function command(cmd, cb) {
  exec(cmd, { cwd: __dirname }, function(err, stdout, stderr) {
    cb(stdout.split('\n').join(''));
  });
}

/**
 * Revise a pathname.
 * @param {*} pth
 * @param {*} hash
 */
function revisePath(pth, hash) {
  if (!(pth && hash)) {
    throw new Error('`path` and `hash` required');
  }

  return modifyFilename(pth, (filename, ext) => `${filename}-${hash}${ext}`);
}

/**
 * Replace pathname.
 * @param {*} base
 * @param {*} filePath
 */
function replacePath(base, filePath) {
  filePath = filePath.replace(/\\/g, '/');
  base = base.replace(/\\/g, '/');

  if (!filePath.startsWith(base)) {
    return filePath;
  }

  const newPath = filePath.slice(base.length);

  if (newPath[0] === '/') {
    return newPath.slice(1);
  }

  return newPath;
}

/**
 * Transforms a filename
 * @param {*} file
 * @param {*} revHash
 */
function transformFilename(file, revHash) {
  file.revOrigPath = file.path;
  file.revOrigBase = file.base;
  file.revHash = revHash;

  file.path = modifyFilename(file.path, (filename, extension) => {
    const extIndex = filename.indexOf('.');

    filename =
      extIndex === -1
        ? revisePath(filename, file.revHash)
        : revisePath(filename.slice(0, extIndex), file.revHash) +
          filename.slice(extIndex);

    return filename + extension;
  });
}

const getManifestFile = opts =>
  vinylFile.read(opts.path, opts).catch(err => {
    if (err.code === 'ENOENT') {
      return new Vinyl(opts);
    }

    throw err;
  });

const plugin = () => {
  const sourcemaps = [];
  const pathMap = {};

  return through.obj(
    (file, enc, cb) => {
      if (file.isNull()) {
        cb(null, file);
        return;
      }

      if (file.isStream()) {
        cb(new PluginError('gulp-githead-rev', 'Streaming not supported'));
        return;
      }

      if (path.extname(file.path) === '.map') {
        sourcemaps.push(file);
        cb();
        return;
      }

      command('git rev-parse --short HEAD', function(revHash) {
        const oldPath = file.path;
        transformFilename(file, revHash);
        pathMap[oldPath] = revHash;

        cb(null, file);
      });
    },
    function(cb) {
      sourcemaps.forEach(file => {
        let reverseFilename;

        try {
          reverseFilename = JSON.parse(file.contents.toString()).file;
        } catch (_) {}

        if (!reverseFilename) {
          reverseFilename = path.relative(
            path.dirname(file.path),
            path.basename(file.path, '.map')
          );
        }

        if (pathMap[reverseFilename]) {
          file.revOrigPath = file.path;
          file.revOrigBase = file.base;

          const hash = pathMap[reverseFilename];
          file.path = revisePath(file.path.replace(/\.map$/, ''), hash) + '.map';
        } else {
          transformFilename(file);
        }

        this.push(file);
      });

      cb();
    }
  );
};

plugin.manifest = (pth, opts) => {
  if (typeof pth === 'string') {
    pth = { path: pth };
  }

  opts = Object.assign(
    {
      path: 'rev-manifest.json',
      merge: false,
      transformer: JSON
    },
    opts,
    pth
  );

  let manifest = {};

  return through.obj(
    (file, enc, cb) => {
      // Ignore all non-rev'd files
      if (!file.path || !file.revOrigPath) {
        cb();
        return;
      }

      const revisionedFile = replacePath(
        path.resolve(file.cwd, file.base),
        path.resolve(file.cwd, file.path)
      );
      const originalFile = path
        .join(path.dirname(revisionedFile), path.basename(file.revOrigPath))
        .replace(/\\/g, '/');

      manifest[originalFile] = revisionedFile;

      cb();
    },
    function(cb) {
      // No need to write a manifest file if there's nothing to manifest
      if (Object.keys(manifest).length === 0) {
        cb();
        return;
      }

      getManifestFile(opts)
        .then(manifestFile => {
          if (opts.merge && !manifestFile.isNull()) {
            let oldManifest = {};

            try {
              oldManifest = opts.transformer.parse(manifestFile.contents.toString());
            } catch (_) {}

            manifest = Object.assign(oldManifest, manifest);
          }

          manifestFile.contents = Buffer.from(
            opts.transformer.stringify(manifest, null, '  ')
          );
          this.push(manifestFile);
          cb();
        })
        .catch(cb);
    }
  );
};

module.exports = plugin;
