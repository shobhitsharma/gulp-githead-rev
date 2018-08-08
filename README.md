# gulp-githead-rev
> Static asset revisioning using latest git commit for the repository

This gulp plugin introduces generating file hashes based on repository's latest git using [git revision history](https://git-scm.com/docs/git-rev-list) commands. By default it takes shorter form of latest commit hash.

### Why?
The idea behind this is to eliminate possible bug which module bundlers like webpack, require.js, browserify generates during minification leading different filesize even though the content is same; such situation can affect files hosted around multiple servers with round-robin patterns which may serve wrong file based of varying hashes.

This is basically a fork over [gulp-rev@8.1.1](https://github.com/sindresorhus/gulp-rev) plugin which differs in separate hash generation.

## Usage

```shell
npm install --save-dev gulp-githead-rev
```

### Example

```javascript
var rev = require('gulp-githead-rev');

gulp.task('default', function(){
  gulp.src(['src/**/*.js'])
    .pipe(rev())
    .pipe(gulp.dest('dist'));
});
```

```javascript
var rev = require('gulp-githead-rev');

gulp.task('default', function(){
  gulp.src(['src/**/*.js'])
    .pipe(rev())
    .pipe(rev.manifest())
    .pipe(gulp.dest('dist'));
});
```
