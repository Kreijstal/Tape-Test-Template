function updateCompletionElement(message) {
  if (typeof document !== 'undefined') {
    window.testsCompleted=true;
    var completionElement = document.getElementById('test-completion');
    if (completionElement) {
      completionElement.textContent = message;
      completionElement.style.display = 'block';
      console.log('Completion element updated:', message);
    } else {
      console.error('Completion element not found');
    }
  } else {
    console.log('Document not available, running in Node.js');
  }
}

function checkNoTestsRan(test) {
  test.onFinish(()=>{
    updateCompletionElement('Tests completed successfully');
  });
  setTimeout(function() {
    if (typeof document !== 'undefined' && document.getElementById('test-completion').style.display === 'none') {
      console.log('No tests ran, updating completion element');
      updateCompletionElement('No tests ran');
    }
  }, 1000);
}

module.exports = {
  updateCompletionElement,
  checkNoTestsRan
};
