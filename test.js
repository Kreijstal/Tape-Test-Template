var test = require('tape');

test('Hello World', function (t) {
  t.plan(1);
  t.equal(2 + 2, 4, '2 + 2 should equal 4');
  t.on('end', function () {
    if (typeof document !== 'undefined') {
      var completionElement = document.getElementById('test-completion');
      completionElement.textContent = 'Tests completed successfully';
      completionElement.style.display = 'block';
    }
  });
});
