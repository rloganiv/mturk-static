// Global variables

var assignmentId;
var questionFile;
var questions;
var questionId = 0;
var imageId = 0;
var answers = {};


// Utility functions

function getUrlVars() {
    /* Returns the URL variables */
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}


// Display functions

function render() {
    /* Renders the question information. */
    displayTitle();
    displayImage();
    displayImageNav();
    displayDescription();
    displayForm();
}

function displayTitle() {
    /* Displays the product title for the active question. */
    var title = questions[questionId].title;
    $('#product-title').text(title);
}

function displayImage() {
    /* Dsiplays the active image for the active question. */
    var image_src = 'https://s3-us-west-2.amazonaws.com/mae-mturk/img/' + questions[questionId].images[imageId];
    $("#image").replaceWith($("<img>", {id:"image", src: image_src}));
}

function displayImageNav() {
    /* Displays the image navbar if there are multiple images for the active question. */
    var multipleImages = questions[questionId].images.length > 1;
    if (multipleImages) {
        $("#image-nav").empty()
        var prevButton = $("<input>", {type:"button", value:"prev", id:"prev-button", onclick:"prevImage();"});
        $("#image-nav").append(prevButton);
        var nextButton = $("<input>", {type:"button", value:"next", id:"next-button", onclick:"nextImage();"});
        $("#image-nav").append(nextButton);
    }
    disableButtons();
}

function displayDescription() {
    /* Displays the product description for the active question. */
    var description = questions[questionId].text;
    $('#product-description').text(description);
}

function shuffleArray(arr) {
    /* Shuffle an array in place. */
    var j, x, i;
    for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
    }
    return arr;
}

function displayForm() {
    /* Displays the form. */

    // Update attribute
    var attribute = questions[questionId].attribute;
    $('#form-attribute').text(attribute);

    // Update values
    var options = questions[questionId].options;
    shuffleArray(options) //Shuffle to avoid bad actors
    $('#form-values').empty();
    for (var id in options) {
        var input = $('<input>', {type: 'radio', name: 'value', value: options[id]});
        var label = $('<label>').text(options[id]);
        $('#form-values').append(input);
        $('#form-values').append(label);
        $('#form-values').append($('<br>'));
    }

    // NA value
    var input = $('<input>', {type: 'radio', name: 'value', value: '__NA__'});
    var label = $('<label>').text('Not Answerable');
    $('#form-values').append(input);
    $('#form-values').append(label);
    $('#form-values').append($('<br>'));

    $('input[name="modeUsed"]').prop('checked', false);

    if (questionId < questions.length - 1) {
        // This isn't even my final form
        var instructions = $('<p>').text('Click next to proceed.');
        var button = $('<input>', {type: 'button', value: 'next', onclick: 'nextQuestion()'});
    }
    else {
        // This is my final form !!!
        var instructions = $('<p>').text('Click done to finish the HIT.');
        var button = $('<input>', {type: 'button', value: 'done', onclick: 'nextQuestion()'});
    }
    $('#form-process').empty();
    $('#form-process').append(instructions);
    $('#form-process').append(button);
}


// Image navbar functions

function prevImage() {
    /* Decreases the image index. */
    imageId = imageId - 1;
    displayImage();
    disableButtons();
}


function nextImage() {
    /* Increases the image index. */
    imageId = imageId + 1;
    displayImage();
    disableButtons();
}

function disableButtons() {
    /* Disables image nav buttons to prevent imageId from going past the size of the images array. */
    var atBeginning = imageId == 0;
    var atEnd = imageId == (questions[questionId].images.length - 1);
    if (atBeginning) {
        $('#prev-button').prop("disabled", true);
    } else {
        $('#prev-button').prop("disabled", false);
    }
    if (atEnd) {
        $('#next-button').prop("disabled", true);
    } else {
        $('#next-button').prop("disabled", false);
    }
}


// Form functions

function nextQuestion() {
    /* Event handler when proceeding to next question */
    good_answer = validate()
    if (good_answer) {
        answers[questionId] = serializeObject();
        questionId += 1;
        imageId = 0;
    }
    if (questionId >= questions.length) {
        prepare_for_submission();
        $('#task-form').submit();
    } else {
        render();
    }
}

function serializeObject(){
    array = $('#task-form').serializeArray();

    output = {
        usedImage: false,
        usedTitle: false,
        usedText: false
    };

    for (var x in array) {
        y = array[x];
        if (y.name == 'value'){
            output.value = y.value;
        }
        if ((y.name == 'modeUsed') && (y.value == 'image')){
            output.usedImage = true;
        }
        if ((y.name == 'modeUsed') && (y.value == 'title')){
            output.usedTitle = true;
        }
        if ((y.name == 'modeUsed') && (y.value == 'text')){
            output.usedText = true;
        }
    }
    return output
}

function validate() {
    /* Validates that the form inputs are sensible. If form is invalid, alert is displayed describing why. */
    var valueSelection = $("input[name='value']:checked").val();
    var isNull = valueSelection == '__NA__';
    var checkboxVals = [];
    $("input[name='modeUsed']:checked").each(function(){
        checkboxVals.push($(this).val());
    });
    var numChecked = checkboxVals.length;
    if (typeof(valueSelection)=="undefined"){
        alert("ERROR: You forgot to select an answer.");
        return false;
    }
    if (isNull & (numChecked > 0)){
        alert("ERROR: You must leave the checkboxes blank when choosing 'Not Answerable'.");
        return false;
    }
    if (!isNull & (numChecked == 0)){
        alert("ERROR: You must indicate which pieces of information you used to answer the question.");
        return false;
    }
    return true;
}

function prepare_for_submission() {
    $('<input>').attr('type', 'hidden').attr('name', 'assignmentId').attr('value', assignmentId).appendTo('#task-form');
    $('<input>').attr('type', 'hidden').attr('name', 'questionFile').attr('value', questionFile).appendTo('#task-form');
    for (var i=0; i<questions.length; i++) {
        if (questions[i].known) {
            $('<input>').attr('type', 'hidden').attr('name', 'selectedValueKnown').attr('value', answers[i].value).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'usedImageKnown').attr('value', answers[i].usedImage).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'usedTitleKnown').attr('value', answers[i].usedTitle).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'usedTextKnown').attr('value', answers[i].usedText).appendTo('#task-form');
        }
        else {
            $('<input>').attr('type', 'hidden').attr('name', 'diffbotUri'+i).attr('value', questions[i].diffbotUri).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'attribute'+i).attr('value', questions[i].attribute).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'correctValue'+i).attr('value', questions[i].correct_value).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'selectedValue'+i).attr('value', answers[i].value).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'usedImage'+i).attr('value', answers[i].usedImage).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'usedTitle'+i).attr('value', answers[i].usedTitle).appendTo('#task-form');
            $('<input>').attr('type', 'hidden').attr('name', 'usedText'+i).attr('value', answers[i].usedText).appendTo('#task-form');
        }
    }
}

// Main page logic
$(document).ready(function() {
    var urlVars = getUrlVars();
    assignmentId = urlVars['assignmentId'];
    turkSubmitTo = decodeURIComponent(urlVars['turkSubmitTo']);

    $('#task-form').attr('action', turkSubmitTo + '/mturk/externalSubmit');

    questionFile = 'https://s3-us-west-2.amazonaws.com/mae-mturk/questionnaires/' + urlVars['questionFile'];
    var getJSON =$.getJSON(questionFile);
    getJSON.done(function( data ) {
        questions = data;
        render();
    });
    $('#myModal').modal('show');

});


