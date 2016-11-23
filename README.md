Conditional fields
======================

This extension allows you to add a `condition:` array to fields and repeater sub-fields and taxonomies.

If no fields are visible on a group (tab) then the group's tab will be hidden. The tab will be shown again if a field inside it is shown.

## Config

The various config options are displayed below:

```yml
field:
    label: "abc"
    type: text
    
# The condition array
    condition:
    # The trigger field (check the fields id in the HTML)
        field: fieldname | taxonomy-taxonomyname
    # The operator to test the condition with
        operator: = | !=
    # If the condition is met, show or hide this field
        show: true | false 
    # The values to match the condition against  
        value: [ '' ] | [ a,b,c] | { "a":'A', "b":'c' } 
```

`value: [ '' ]` = field value is empty
 

## Adding conditions

In your `contenttypes.yml`, add a `condition:` array and indent accordingly:


### Fields

To make a field conditional, add a `condition:` array to the field, this works for all field including entire repeaters.

```yml
map:
    label: "Map"
    type: geolocation
    condition:
        field: template
        operator: '='
        show: true
        value: [ "page-contact.twig" ]
```

The above example is based on a template field, this is also possible via `templatefields` in your `theme.yml`, however setting this up as a conditional field allows for more control over grouping. 


#### Repeaters

It is also possible to add conditional fields to the fields *within* a repeater, e.g. the below:

Please note, these fields can __only__ be conditional on fields *within* each repeater group. So for example, you can't currently have a conditional repeater sub field dependant on the page's template.

```yml
        featured_content:
            group: "Featured content"
            label: "Featured Items"
            type: repeater
            fields:
                type_of_content:
                    label: "Type of content"
                    type: select
                    values: { 'page': "Page", 'news': "News" }
                item_page:
                    label: "Page"
                    type: select
                    values: page/title
                    condition:
                        field: type_of_content
                        operator: '='
                        show: true
                        value: [ 'page' ]
                item_news:
                    label: "News"
                    type: select
                    values: news/title
                    condition:
                        field: type_of_content
                        operator: '='
                        show: true
                        value: [ 'news' ]
                size:
                    label: "Card size"
                    type: select
                    values: [ 'small', 'medium', 'large' ]

```

### Taxonomies

To add conditional taxonomies you can add a `condition:` to your `taxonomy.yml` file.

```yml
tags:
    slug: tags
    singular_slug: tag
    behaves_like: tags
    postfix: "Add some freeform tags. Start a new tag by typing a comma."
    allow_spaces: true
    condition:
        news:
            field: taxonomy-newstype
            operator: '!='
            show: true
            value: [ press-release ]
        contenttype2:
            field: taxonomy-taxonomyname
            operator: '='
            show: false
            value: [ abc ]
        contenttype3:
            field: template
            operator: '='
            show: true
            value: [ '' ]
    searchweight: 25
```

## Trigger Fields

These field types are allowed to be set as the trigger field, this is the field that is going to be "watched". When this field is changed, the conditional fields that depend on it will be checked.
* Select

*Adding more field types to the `on('change', func...` event should be fairly easy but I haven't had a use case to test with yet.*


#### Note:
This extension has been built with a specific project in mind, I have tried to generalise functionality as much as possible but there may still be field types that don't work quite right just yet. Please use with caution, if you notice any bugs please submit an issue or a PR.
