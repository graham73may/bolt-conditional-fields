<?php

namespace Bolt\Extension\Soapbox\ConditionalFields;

use Bolt\Asset\File\JavaScript;
use Bolt\Extension\SimpleExtension;
use Bolt\Controller\Zone;
use Bolt\Asset\Snippet\Snippet;
use Bolt\Application;
use Bolt\Asset\Target;

/**
 * ConditionalFields extension class.
 *
 * @author Graham May <graham.may@soapbox.co.uk>
 */
class ConditionalFieldsExtension extends SimpleExtension
{

    /**
     * Pretty extension name
     *
     * @return string
     */
    public function getDisplayName()
    {

        return 'Conditional Fields';
    }

    /**
     * {@inheritdoc}
     */
    protected function registerAssets()
    {

        /**
         * @var Application $app
         */
        $app           = $this->getContainer();
        $content_types = $app['config']->get('contenttypes');
        $taxonomies    = $app['config']->get('taxonomy');

        // Template Fields
        $theme           = $app['config']->get('theme');
        $template_fields = '';

        if (!empty($theme['templatefields'])) {
            $template_fields = $theme['templatefields'];
        }

        // Load the conditional fields javascript file
        $asset = new JavaScript();

        $asset->setFileName('conditional-fields.js')
              ->setZone(Zone::BACKEND)
              ->setLate(true);

        // Content Types
        $content_types_json    = $this->sanitiseJsonString($content_types);
        $content_types_snippet = (new Snippet())->setCallback('<script>var contentTypes = JSON.parse(\'' . $content_types_json . '\');</script>')
                                                ->setZone(Zone::BACKEND)
                                                ->setLocation(Target::BEFORE_HEAD_JS);

        // Taxonomies
        $taxonomies_json    = $this->sanitiseJsonString($taxonomies);
        $taxonomies_snippet = (new Snippet())->setCallback('<script>var taxonomies = JSON.parse(\'' . $taxonomies_json . '\');</script>')
                                             ->setZone(Zone::BACKEND)
                                             ->setLocation(Target::BEFORE_HEAD_JS);

        // Template Fields
        $template_fields_json    = $this->sanitiseJsonString($template_fields);
        $template_fields_snippet = (new Snippet())->setCallback('<script>var templateFields = JSON.parse(\'' . $template_fields_json . '\');</script>')
                                                  ->setZone(Zone::BACKEND)
                                                  ->setLocation(Target::BEFORE_HEAD_JS);

        return [
            $taxonomies_snippet,
            $content_types_snippet,
            $template_fields_snippet,
            $asset
        ];
    }

    private function sanitiseJsonString($encode_me)
    {

        // Convert array to JSON
        $json = str_replace('\\\\', '\\', json_encode($encode_me, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE));

        // Remove string line breaks that are parsed in to actual line breaks by JSON.parse()
        $json = str_replace("\\n", "", $json);

        return $json;
    }
}
