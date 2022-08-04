/* global contentTypes, taxonomies */

// SBTODO: Multiple conditions
// SBTODO: < and > condition functionality
// SBTODO: Make condition: yaml use the field name instead of the backend html class/id (kind of does this already, but taxonomies and relations get prepended)
// SBTODO: On hide, set value to null / empty so they don't still submit (Should clear: true | false be a setting?)

(function ($) {
    'use strict';

    // Content Types
    var contentType = $('#contenttype').val();
    var ctConfig    = contentTypes[contentType];

    var allFields = null;
    var fieldName = '';

    // Repeaters
    var allRepeaterFields = null;
    var repeaterToAdd     = null;
    var regexPattern;

    // Relations
    var allRelations  = null;
    var relationToAdd = null;

    // Taxonomies
    var allTaxonomies = taxonomies;
    var taxonomyToAdd = null;

    // Templatefields
    var $templateSelect    = $('.bolt-field-templateselect select');
    var templatefieldToAdd = null;

    // Conditional Arrays
    var fieldsToWatch         = [];
    var repeaterFieldsToWatch = [];
    var conditionalFields     = [];
    var repeaterFields        = [];

    if (ctConfig !== undefined) {
        initContenttypeFields();

        initTemplatefieldFields();

        initRelationFields();

        initTaxonomyFields();

        $(document).on('ready', function () {
            watchFieldsForChange();

            var i;
            var len = fieldsToWatch.length;
            var $fieldToWatch;
            var watchName;
            var watchVal;

            // Check conditional fields
            for (i = 0; i < len; i += 1) {
                console.log('# Checking fields that have conditionals on: "#' + fieldsToWatch[i] + '"');

                $fieldToWatch = $('#' + fieldsToWatch[i]);

                if (!$fieldToWatch.length) {
                    $fieldToWatch = $('[name=' + fieldsToWatch[i] + ']');
                }

                watchName = $fieldToWatch.attr('id');
                watchVal  = $fieldToWatch.val();

                if ($fieldToWatch.is('input[type="checkbox"]')) {
                    watchName = $fieldToWatch.attr('name');
                }

                if ($fieldToWatch.is('input[type="checkbox"]') && !$fieldToWatch.is(':checked')) {
                    watchVal = '0';
                }

                checkConditionalFields(watchName, watchVal);
            }

            // Check conditional fields inside repeaters
            runRepeaterCheck();

            // On new repeater item, check for conditional fields
            $('.repeater-add').on('click', function () {
                runRepeaterCheck();
            });
        });
    }

    function checkConditionalFields (id, watchedValue) {
        // Check the watched value against fields with conditions
        for (var name in conditionalFields) {
            if (conditionalFields.hasOwnProperty(name)) {
                if (conditionalFields[name]['condition']['field'] !== id) {
                    continue;
                }

                // Find the bolt fieldset container
                var $field;

                if (conditionalFields[name].hasOwnProperty('type')) {
                    switch (conditionalFields[name]['type']) {
                        case 'repeater':
                            $field = $('[name="' + name + '[]"]');

                            break;
                        case 'relation':
                            $field = $('#relation-' + name);

                            break;
                        case 'taxonomy':
                            $field = $('#taxonomy-' + name);

                            break;
                        case 'filelist':
                        case 'textarea':
                        case 'checkbox':
                            $field = $('[name=' + name + ']');

                            break;
                        case 'image':
                        case 'file':
                            $field = $('#field-' + name);

                            break;
                        case 'geolocation':
                            $field = $('[name*="' + name + '[address]"]');

                            break;
                        case 'video':
                            $field = $('[name*="' + name + '[url]"]');

                            break;
                        default:
                            $field = $('#' + name);

                            break;
                    }
                }

                if ($field.length === 0) {
                    console.error('Conditional field could not be hidden: ' + name + '. Type = {' + conditionalFields[name]['type'] + '}');
                }

                var $fieldContainer = $field.closest('[data-bolt-fieldset]');

                // Config value whether to show / hide the field on condition matched
                var showField = (conditionalFields[name]['condition']['show'] === undefined || conditionalFields[name]['condition']['show']);

                // Check if the value matches
                var conditionMatched = false;

                // Check if field's value is null (e.g. this occurs for images)
                if (watchedValue === null) {
                    watchedValue = '';
                }

                if (typeof watchedValue === 'object') {
                    var i   = 0;
                    var len = watchedValue.length;

                    for (i = 0; i < len; i += 1) {
                        if (conditionalFields[name]['condition']['value'].indexOf(watchedValue[i]) > -1) {
                            conditionMatched = true;

                            break;
                        }
                    }
                } else {
                    if (conditionalFields[name]['condition']['value'].indexOf(watchedValue) > -1) {
                        conditionMatched = true;
                    }
                }

                // If the condition is a != condition, invert the conditionMatched result
                if (conditionalFields[name]['condition']['operator'] === '!=' && conditionMatched) {
                    conditionMatched = false;
                } else if (conditionalFields[name]['condition']['operator'] === '!=') {
                    conditionMatched = true;
                }

                if ((showField && conditionMatched) || (!showField && !conditionMatched)) {
                    console.log('--> Show ' + name);

                    showFieldset($fieldContainer);
                } else {
                    console.log('--> Hide ' + name);

                    hideFieldset($fieldContainer);
                }
            }
        }

        checkTabPanes();
    }

    function runRepeaterCheck () {
        // Check conditional fields inside repeaters
        var $repeaterFieldToWatch;
        var i;
        var len = repeaterFieldsToWatch.length;

        for (i = 0; i < len; i += 1) {
            console.log('# Checking repeater fields that have conditionals on: "name=/' + repeaterFieldsToWatch[i] + '/"');

            $repeaterFieldToWatch = $('select, input, textarea').filter(function () {
                if (typeof $(this).attr('name') === 'undefined') {
                    return false;
                }

                return $(this).attr('name').match(new RegExp(repeaterFieldsToWatch[i]))
            });

            // If repeater fields have been found, loop through them and check the conditional fields within the repeater-group
            if ($repeaterFieldToWatch.length) {
                $repeaterFieldToWatch.each(function () {
                    checkRepeaterFields($(this).attr('id'), $(this).val());
                })
            }
        }
    }

    function checkRepeaterFields (id, watchedValue) {
        // Check the watched value against fields with conditions
        for (var name in repeaterFields) {
            if (repeaterFields.hasOwnProperty(name)) {
                var repeater          = repeaterFields[name]['repeater'];
                var watchedFieldRegex = new RegExp(repeater + '\\[\\d+\\]\\[' + repeaterFields[name]['condition']['field'] + '\\]');
                var fieldRegex        = new RegExp(repeater + '\\[\\d+\\]\\[' + name + '\\]');
                var $watched_field    = $('#' + id);

                if (!watchedFieldRegex.test($watched_field.attr('name'))) {
                    continue;
                }

                // Find the bolt fieldset container
                var $field = $watched_field.closest('.repeater-group').find('select, input, textarea').filter(function () {
                    if (typeof $(this).attr('name') === 'undefined') {
                        return false;
                    }

                    return $(this).attr('name').match(fieldRegex);
                });

                if ($field.length === 0) {
                    console.error('Conditional repeater field could not be hidden: ' + name + '. Type = {' + repeaterFields[name]['type'] + '}');
                }

                var $fieldContainer = $field.closest('.repeater-field');

                // Config value whether to show / hide the field on condition matched
                var showField = (repeaterFields[name]['condition']['show'] === undefined || repeaterFields[name]['condition']['show']);

                // Check if the value matches
                var conditionMatched = false;

                if (typeof watchedValue === 'object') {
                    var i   = 0;
                    var len = watchedValue.length;

                    for (i = 0; i < len; i += 1) {
                        if (repeaterFields[name]['condition']['value'].indexOf(watchedValue[i]) > -1) {
                            conditionMatched = true;

                            break;
                        }
                    }
                } else {
                    if (repeaterFields[name]['condition']['value'].indexOf(watchedValue) > -1) {
                        conditionMatched = true;
                    }
                }

                // If the condition is a != condition, invert the conditionMatched result
                if (repeaterFields[name]['condition']['operator'] === '!=' && conditionMatched) {
                    conditionMatched = false;
                } else if (repeaterFields[name]['condition']['operator'] === '!=') {
                    conditionMatched = true;
                }

                if ((showField && conditionMatched) || (!showField && !conditionMatched)) {
                    console.log('--> Show ' + repeater + ' field: ' + name);

                    showFieldset($fieldContainer);
                } else {
                    console.log('--> Hide ' + repeater + ' field: ' + name);

                    hideFieldset($fieldContainer);
                }
            }
        }
    }

    function initContenttypeFields () {
        allFields    = ctConfig['fields'];
        allRelations = ctConfig['relations'];

        // Check condition config to see what fields need to be checked
        for (var name in allFields) {
            if (allFields.hasOwnProperty(name) && allFields[name].hasOwnProperty('condition')) {
                if (allFields[name]['condition'].hasOwnProperty('field')) {
                    fieldName = allFields[name]['condition']['field'];

                    if (fieldsToWatch.indexOf(fieldName) === -1) {
                        // Fields to watch the value change of
                        fieldsToWatch.push(fieldName);
                    }

                    // Add to Conditional fields
                    conditionalFields[name] = allFields[name];
                }
            }

            // Check repeater fields and build array of repeaters to watch
            if (allFields.hasOwnProperty(name) && allFields[name].hasOwnProperty('type') && allFields[name]['type'] === 'repeater') {
                allRepeaterFields = allFields[name]['fields'];

                for (var field in allRepeaterFields) {
                    if (allRepeaterFields.hasOwnProperty(field) && allRepeaterFields[field].hasOwnProperty('condition')) {
                        if (allRepeaterFields[field]['condition'].hasOwnProperty('field')) {
                            fieldName = allRepeaterFields[field]['condition']['field'];

                            if (repeaterFieldsToWatch.indexOf(name + '\\[\\d+\\]\\[' + fieldName + '\\]') === -1) {
                                // Fields to watch the value change of
                                repeaterFieldsToWatch.push(name + '\\[\\d+\\]\\[' + fieldName + '\\]');
                            }

                            repeaterToAdd = allRepeaterFields[field];

                            // Flag this entry as a repeater sub field
                            repeaterToAdd['repeater'] = name;

                            // Add this field to the repeaterFields array
                            repeaterFields[field] = repeaterToAdd;
                        }
                    }
                }
            }
        }
    }

    function initRelationFields () {
        // Check Relations for condition config to see what relationships need to be checked
        for (var relName in allRelations) {
            if (allRelations.hasOwnProperty(relName) && allRelations[relName].hasOwnProperty('condition')) {
                if (allRelations[relName]['condition'].hasOwnProperty('field')) {
                    fieldName = allRelations[relName]['condition']['field'];

                    if (fieldsToWatch.indexOf(fieldName) === -1) {
                        // Fields to watch the value change of
                        fieldsToWatch.push(fieldName);
                    }

                    relationToAdd = allRelations[relName];

                    // Force the field type
                    relationToAdd['type'] = 'relation';

                    // Add to Conditional fields
                    conditionalFields[relName] = relationToAdd;
                }
            }
        }
    }

    function initTemplatefieldFields () {
        // Check templatefields for condition config to see what relationships need to be checked
        if ($templateSelect.length && $templateSelect.val().length) {
            var selectedTemplate = $templateSelect.val();

            if (templateFields.hasOwnProperty(selectedTemplate)) {
                var fieldsForTemplate = templateFields[selectedTemplate]['fields'];

                // Check templatefields for condition config to see what templatefields need to be checked
                for (var templatefieldName in fieldsForTemplate) {
                    if (fieldsForTemplate.hasOwnProperty(templatefieldName) && fieldsForTemplate[templatefieldName].hasOwnProperty('condition')) {
                        templatefieldToAdd = fieldsForTemplate[templatefieldName];

                        fieldName = fieldsForTemplate[templatefieldName]['condition']['field'];

                        if (fieldsToWatch.indexOf(fieldName) === -1) {
                            // Fields to watch the value change of
                            fieldsToWatch.push(fieldName);
                        }

                        // Add to Conditional fields
                        conditionalFields['templatefields-' + templatefieldName] = fieldsForTemplate[templatefieldName];
                    }
                }
            }
        }
    }

    function initTaxonomyFields () {
        // Check taxonomies for condition config to see what taxonomies need to be checked
        for (var taxName in allTaxonomies) {
            if (allTaxonomies.hasOwnProperty(taxName) && allTaxonomies[taxName].hasOwnProperty('condition')) {
                taxonomyToAdd = allTaxonomies[taxName];

                if (taxonomyToAdd['condition'].hasOwnProperty(contentType)) {
                    fieldName = allTaxonomies[taxName]['condition'][contentType]['field'];

                    if (fieldsToWatch.indexOf(fieldName) === -1) {
                        // Fields to watch the value change of
                        fieldsToWatch.push(fieldName);
                    }

                    // Force the field type
                    taxonomyToAdd['type'] = 'taxonomy';

                    // Only use the condition for the relevant content type
                    taxonomyToAdd['condition'] = taxonomyToAdd['condition'][contentType];

                    // Add to Conditional fields
                    conditionalFields[taxName] = taxonomyToAdd;
                }
            }
        }
    }

    function showFieldset ($fieldContainer) {

        var $wasRequiredFields = $fieldContainer.find('.was-required');

        if ($wasRequiredFields.length) {
            $wasRequiredFields.each(function () {
                $(this).attr('required', 'required').removeClass('was-required');
            });
        }

        $fieldContainer.show();
    }

    function hideFieldset ($fieldContainer) {

        var $requiredFields = $fieldContainer.find('[required]');

        if ($requiredFields.length) {
            $requiredFields.each(function () {
                $(this).removeAttr('required').addClass('was-required');
            });
        }

        $fieldContainer.hide();
    }

    function checkTabPanes () {
        var $tabPanes = $('.tab-pane');
        var $fields   = null;

        $tabPanes.each(function () {
            // Find bolt fields
            $fields = $(this).find('[data-bolt-fieldset]');

            // Check which of these are display none (can't use hidden because inactive tabs return as hidden)
            $fields = $fields.filter(function () {
                return $(this).data('bolt-fieldset').length && $(this).css("display") !== "none"
            });

            // Show / Hide the tab if it has visible contents
            if ($fields.length > 0) {
                $('#tabindicator-' + $(this).attr('id')).show();
            } else {
                $('#tabindicator-' + $(this).attr('id')).hide();
            }
        });
    }

    function watchFieldsForChange () {
        // Check for select2 changes
        $(document).on('change', 'select,input', function () {
            var id           = $(this).attr('id');
            var name         = $(this).attr('name');
            var watchedValue = $(this).val();

            if (!id) {
                id = name;
            }

            // Check if the changed select is inside a repeater
            if ($(this).parents('.repeater-field').length) {
                checkRepeaterFields(id, watchedValue);
            }

            // Check the changed field is one of the fieldsToWatch
            if (fieldsToWatch.indexOf(id) > -1) {
                checkConditionalFields(id, watchedValue);
            }
        }).on('click', 'input[type="checkbox"], button', function () {
            var $field = $(this);

            if ($field.is('button')) {
                $field = $field.prev();
            }

            var id           = $field.attr('name');
            var name         = id;
            var watchedValue = $field.val();

            if (!$field.is(':checked')) {
                watchedValue = '0';
            }

            // Check if the changed select is inside a repeater
            if ($field.parents('.repeater-field').length) {
                checkRepeaterFields(id, watchedValue);
            }

            // Check the changed field is one of the fieldsToWatch
            if (fieldsToWatch.indexOf(id) > -1) {
                checkConditionalFields(id, watchedValue);
            }
        });
    }
})(jQuery);
