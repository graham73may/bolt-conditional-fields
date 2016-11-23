/* global contentTypes, taxonomies */

// SBTODO: Multiple conditions
// SBTODO: < and > condition functionality
// SBTODO: Make condition: yaml use the field name instead of the backend html class/id
// SBTODO: add support for fields other than select2 fields (e.g. radio buttons, checkboxes)

(function ($) {
    'use strict';

    // Content Types
    var contentType = $('#contenttype').val();
    var ctConfig    = contentTypes[contentType];

    var allFields = null;
    var fieldName = '';

    // Relations
    var allRelations  = null;
    var relationToAdd = null;

    // Taxonomies
    var allTaxonomies = taxonomies;
    var taxonomyToAdd = null;

    // Conditional Arrays
    var fieldsToWatch     = [];
    var conditionalFields = [];

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
            $('select').on('change', function () {
                var id = $(this).attr('id');

                // Check the changed field is one of the fieldsToWatch
                if (fieldsToWatch.indexOf(id) > -1) {
                    var watchedValue = $(this).val();

                    checkConditionalFields(id, watchedValue);
                }
            });

            var i;
            var len = fieldsToWatch.length;
            var $fieldToWatch;

            for (i = 0; i < len; i += 1) {
                $fieldToWatch = $('#' + fieldsToWatch[i]);

                checkConditionalFields($fieldToWatch.attr('id'), $fieldToWatch.val());
            }
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
                var $field = $('#' + name);

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
                    console.log('> Show ' + name);
                    $fieldContainer.show();
                } else {
                    console.log('> Hide ' + name);
                    $fieldContainer.hide();
                }
            }
        }

        checkTabPanes();
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
