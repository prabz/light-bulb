$(document).ready(() => {
  $("#show-history").click(() => {
    if ($(".ct-chart").is(":visible")) {
      $(".ct-chart").hide()
      $("#show-history").html("Show Training History")
    } else {
      $(".ct-chart").show()
      $("#show-history").html("Hide Training History")
    }
  })

  let plot = (x, y) => {
    new Chartist.Line('.ct-chart', {
      labels: x,
      series: [y]
    }, {
      showLine: false,
      axisX: {
        labelInterpolationFnc: (value, index) => {
          return index % 10 === 0 ? value : null;
        },
      },
      plugins: [
        Chartist.plugins.ctAxisTitle({
          axisX: {
            axisTitle: 'Num Labelled',
            axisClass: 'ct-axis-title',
            offset: {
              x: 0,
              y: 33
            },
            textAnchor: 'middle'
          },
          axisY: {
            axisTitle: 'Test Accuracy (%)',
            axisClass: 'ct-axis-title',
            offset: {
              x: 0,
              y: -5
            },
            textAnchor: 'middle',
            flipTitle: false
          }
        })
      ]
    });
  }

  $(document).keypress((e) => {
    let yes = 106;
    let no = 107;
    if (e.which == yes) {
      submitJudgement('YES')
    }
    if (e.which == no) {
      submitJudgement('NO')
    }
  });

  let itemsToLabel = [];
  let currentIndex = 0;
  let showItem = undefined
  if (window.dataType === 'images') {
    $("#image-classification").css("display", "block")
    showItem = () => {
      let item = itemsToLabel[currentIndex];
      let path = item['path']
      $("#item-image").attr("src", "/images?image_path=" + path)
    }
  } else {
    $("#text-classification").css("display", "block")
    showItem = () => {
      let item = itemsToLabel[currentIndex]
      let text = item['text']
      $("#text-classification-text").html(text)
    }
  }

  let currentItem = () => {
    return itemsToLabel[currentIndex]
  }

  let getTrainingHistory = () => {
    $.get('/history', (data) => {
      let history = data['history']
      let bestAccByNumLabels = {}
      history.forEach((hist) => {
        if (!(hist['num_labels'] in bestAccByNumLabels)) {
          bestAccByNumLabels[hist['num_labels']] = hist['test']['acc']
        }

        bestAccByNumLabels[hist['num_labels']] = Math.max(
          hist['test']['acc'],
          bestAccByNumLabels[hist['num_labels']],
        )
      })
      let maxLabels = Math.max(Object.keys(bestAccByNumLabels))
      let x = []
      let y = []
      for (let i = 0; i <= maxLabels; i++) {
        x.push(i)
        if (i in bestAccByNumLabels) {
          y.push(bestAccByNumLabels[i])
        } else {
          y.push(null)
        }
      }
      plot(x, y)
    })
  }

  let getNextBatch = () => {
    $.get('/batch', (data) => {
      let batch = data['batch'];
      itemsToLabel = itemsToLabel.concat(batch)
      if (currentIndex == 0) {
        showItem()
      }
    })
  }

  let submitJudgement = (label) => {
    let image = currentItem()
    let path = image.path

    $.post('/judgements', {id: path, label: label}, (response) => {
      showNextItem();
      if (currentIndex + 3 > itemsToLabel.length) {
        getNextBatch()
        getTrainingHistory()
      }
    })
  }

  let showNextItem = () => {
    currentIndex += 1
    showItem()
  }

  // Kick everything off
  getNextBatch();
  getTrainingHistory()

  $(".judgement-button").click((el) => {
    let label = $(el.target).data("judgement")
    submitJudgement(label)
  });
})