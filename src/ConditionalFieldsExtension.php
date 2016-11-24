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

        $asset = new JavaScript();

        $asset->setFileName('conditional-fields.js')
              ->setZone(Zone::BACKEND)
              ->setLate(true);

        $content_types_snippet = (new Snippet())->setCallback('<script>var contentTypes = JSON.parse(\'' . str_replace('\\\\', '\\', json_encode($content_types)) . '\');</script>')
                                                ->setZone(Zone::BACKEND)
                                                ->setLocation(Target::BEFORE_HEAD_JS);

        $taxonomies_snippet = (new Snippet())->setCallback('<script>var taxonomies = JSON.parse(\'' . str_replace('\\\\', '\\', json_encode($taxonomies)) . '\');</script>')
                                             ->setZone(Zone::BACKEND)
                                             ->setLocation(Target::BEFORE_HEAD_JS);

        return [
            $taxonomies_snippet,
            $content_types_snippet,
            $asset
        ];
    }
}
