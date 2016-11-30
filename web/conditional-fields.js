/* global contentTypes, taxonomies */

// SBTODO: Multiple conditions
// SBTODO: < and > condition functionality
// SBTODO: Make condition: yaml use the field name instead of the backend html class/id (kind of does this already, but taxonomies and relations get prepended)
// SBTODO: add support for fields other than select fields (e.g. checkboxes)
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

    // Conditional Arrays
    var fieldsToWatch         = [];
    var repeaterFieldsToWatch = [];
    var conditionalFields     = [];
    var repeaterFields        = [];

    if (ctConfig !== undefined) {
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

                            regexPattern = new RegExp(name + '\\[\\d+\\]\\[' + fieldName + '\\]');

                            if (repeaterFieldsToWatch.indexOf(regexPattern) === -1) {
                                // Fields to watch the value change of
                                repeaterFieldsToWatch.push(regexPattern);
                            }

                            repeaterToAdd = allRepeaterFields[field];

                            // Flag this entry as a repeater sub field
                            repeaterToAdd['repeater'] = name;

                            // Add this field to the repeaterFields array
                            //repeaterFields[name + ':' + field] = repeaterToAdd;
                            repeaterFields[field] = repeaterToAdd;
                        }
                    }
                }
            }
        }

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

        $(document).on('ready', function () {
            // Check for select2 changes
            $(document).on('change', 'select', function () {
                var id           = $(this).attr('id');
                var name         = $(this).attr('name');
                var watchedValue = $(this).val();

                // Check if the changed select is inside a repeater
                if ($(this).parents('.repeater-field').length) {
                    checkRepeaterFields(id, watchedValue);
                }

                // Check the changed field is one of the fieldsToWatch
                if (fieldsToWatch.indexOf(id) > -1) {
                    checkConditionalFields(id, watchedValue);
                }
            });

            var i;
            var len = fieldsToWatch.length;
            var $fieldToWatch;

            // Check conditional fields
            for (i = 0; i < len; i += 1) {
                console.log('# Checking fields that have conditionals on: "#' + fieldsToWatch[i] + '"');

                $fieldToWatch = $('#' + fieldsToWatch[i]);

                checkConditionalFields($fieldToWatch.attr('id'), $fieldToWatch.val());
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
                            $field = $('[name*="' + name + '[0]"]');

                            break;
                        case 'relation':
                            $field = $('#relation-' + name);

                            break;
                        case 'taxonomy':
                            $field = $('#taxonomy-' + name);

                            break;
                        case 'filelist':
                        case 'textarea':
                            $field = $('[name=' + name + ']');

                            break;
                        case 'image':
                            $field = $('#field-' + name);

                            break;
                        case 'geolocation':
                            $field = $('[name*="' + name + '[address]"]');

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
                    $fieldContainer.show();
                } else {
                    console.log('--> Hide ' + name);
                    $fieldContainer.hide();
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
                    console.error('Conditional field could not be hidden: ' + name + '. Type = {' + repeaterFields[name]['type'] + '}');
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
                    $fieldContainer.show();
                } else {
                    console.log('--> Hide ' + repeater + ' field: ' + name);
                    $fieldContainer.hide();
                }
            }
        }
    }

    function checkTabPanes () {
        var $tabPanes = $('.tab-pane');
        var $fields   = null;

        $tabPanes.each(function () {
            // Find bolt fields
            $fields = $(this).find('[data-bolt-fieldset]');

            // Check which of these are display none (can't use hidden because inactive tabs return as hidden)
            $fields = $fields.filter(function () {
                return $(this).css("display") !== "none"
            });

            // Show / Hide the tab if it has visible contents
            if ($fields.length > 0) {
                $('#tabindicator-' + $(this).attr('id')).show();
            } else {
                $('#tabindicator-' + $(this).attr('id')).hide();
            }
        });
    }
})(jQuery);
