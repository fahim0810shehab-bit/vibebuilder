import { menuItems } from './sidebar-menu';

describe('Sidebar Menu Items', () => {
  it('should have only VibeBuilder menu item', () => {
    expect(menuItems).toHaveLength(1);
    expect(menuItems[0]).toEqual(
      expect.objectContaining({
        id: 'vibebuilder',
        name: 'VibeBuilder',
        path: '/vibebuilder',
      })
    );
  });
});
