# gulp-githead-rev
> Static asset revisioning using latest git commit for the repository

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
