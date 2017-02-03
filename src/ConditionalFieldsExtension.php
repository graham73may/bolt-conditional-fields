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

        $asset = new JavaScript();

        $asset->setFileName('conditional-fields.js')
              ->setZone(Zone::BACKEND)
              ->setLate(true);

        $content_types_snippet = (new Snippet())->setCallback('<script>var contentTypes = JSON.parse(\'' . str_replace('\\\\', '\\',
                json_encode($content_types, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)) . '\');</script>')
                                                ->setZone(Zone::BACKEND)
                                                ->setLocation(Target::BEFORE_HEAD_JS);

        $taxonomies_snippet = (new Snippet())->setCallback('<script>var taxonomies = JSON.parse(\'' . str_replace('\\\\', '\\',
                json_encode($taxonomies, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)) . '\');</script>')
                                             ->setZone(Zone::BACKEND)
                                             ->setLocation(Target::BEFORE_HEAD_JS);

        $template_fields_snippet = (new Snippet())->setCallback('<script>var templateFields = JSON.parse(\'' . str_replace('\\\\', '\\',
                json_encode($template_fields, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)) . '\');</script>')
                                                  ->setZone(Zone::BACKEND)
                                                  ->setLocation(Target::BEFORE_HEAD_JS);

        return [
            $taxonomies_snippet,
            $content_types_snippet,
            $template_fields_snippet,
            $asset
        ];
    }
}
