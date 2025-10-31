import { useState } from 'react';
import { 
  NeoButton, 
  NeoSwitch, 
  NeoTabs, 
  NeoSearchBar, 
  NeoTaskBadge,
  NeoSlider,
  NeoMenuIcons,
  NeoStatusIndicator
} from '../components/neumorphic';
import { ThemeToggle } from '../components/ThemeToggle';
import { Users, Monitor, RefreshCw } from 'lucide-react';

export const Showcase = () => {
  const [switchChecked, setSwitchChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState(65);
  const [activeTab, setActiveTab] = useState('tab1');
  const [activeMenuItem, setActiveMenuItem] = useState('paperclip');

  return (
    <div className="min-h-screen bg-neo-bg-light dark:bg-neo-bg-dark transition-colors duration-300 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Theme Toggle */}
        <div className="mb-12 text-center relative">
          {/* Theme Toggle - Fixed top right */}
          <div className="fixed top-8 right-8 z-50">
            <ThemeToggle />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Neumorphic UI System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Modern, minimalist components with soft shadows and smooth animations
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Toggle theme using the button in the top right →
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Buttons Section */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Buttons</h2>
            <div className="space-y-4">
              <NeoButton label="Invite friends" />
              <NeoButton 
                label="Invite friends" 
                icon={<Users className="w-5 h-5" />} 
              />
              <NeoButton 
                label="Active Button" 
                active 
              />
              <NeoButton 
                label="Glowing Button" 
                glowing 
              />
            </div>
          </div>

          {/* Icon Buttons */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Icon Buttons</h2>
            <div className="flex gap-3">
              <NeoButton 
                icon={<Monitor className="w-5 h-5" />} 
                label=""
                className="w-12 h-12 p-0 justify-center"
              />
              <NeoButton 
                icon={<Monitor className="w-5 h-5" />} 
                label=""
                className="w-12 h-12 p-0 justify-center"
                active
              />
              <NeoButton 
                icon={<RefreshCw className="w-5 h-5" />} 
                label=""
                className="w-12 h-12 p-0 justify-center"
              />
            </div>
          </div>

          {/* Switch/Toggle */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Switch</h2>
            <div className="space-y-4">
              <NeoSwitch 
                checked={switchChecked}
                onChange={setSwitchChecked}
                label="Toggle"
              />
              <NeoSwitch checked={true} label="Always On" />
              <NeoSwitch checked={false} label="Always Off" />
            </div>
          </div>

          {/* Tabs */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Tabs</h2>
            <NeoTabs
              tabs={[
                { id: 'tab1', label: 'Tab' },
                { id: 'tab2', label: 'Tab' },
                { id: 'tab3', label: 'Tab' },
              ]}
              defaultTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {/* Search Bar */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Search Bar</h2>
            <NeoSearchBar 
              placeholder="Search..."
              onSearch={(value) => console.log('Search:', value)}
            />
          </div>

          {/* Task Badge */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Task Badge</h2>
            <div className="space-y-3">
              <NeoTaskBadge 
                primaryLabel="Task" 
                secondaryLabel="New"
                secondaryColor="orange"
              />
              <NeoTaskBadge 
                primaryLabel="Task" 
                secondaryLabel="Active"
                secondaryColor="green"
              />
              <NeoTaskBadge 
                primaryLabel="Task" 
                secondaryLabel="Pending"
                secondaryColor="blue"
              />
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Slider</h2>
            <div className="space-y-6">
              <NeoSlider
                value={sliderValue}
                onChange={setSliderValue}
                label="Volume"
              />
              <NeoSlider
                defaultValue={30}
                label="Brightness"
              />
            </div>
          </div>

          {/* Menu Icons */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Menu Icons</h2>
            <NeoMenuIcons
              activeItem={activeMenuItem}
              onItemClick={setActiveMenuItem}
            />
          </div>

          {/* Status Indicator */}
          <div className="space-y-6 p-6 rounded-3xl bg-neo-bg-light dark:bg-neo-bg-dark shadow-neo-raised dark:shadow-neo-raised-dark transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Status Indicator</h2>
            <div className="space-y-4">
              <NeoStatusIndicator
                status="Active"
                subtitle="Until changed"
                active={true}
              />
              <NeoStatusIndicator
                status="Inactive"
                subtitle="Click to activate"
                active={false}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 dark:text-gray-400">
          <p>Neumorphic UI System • Built with React, TypeScript, TailwindCSS & Framer Motion</p>
          <p className="text-sm mt-2">✨ Full Light & Dark Mode Support</p>
        </div>
      </div>
    </div>
  );
};
