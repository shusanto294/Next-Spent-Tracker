'use client';

import { useState, useEffect } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface ExpenseFormProps {
  onExpenseAdded: () => void;
}

function SortableCategory({ 
  category, 
  isSelected, 
  onSelect 
}: { 
  category: Category; 
  isSelected: boolean; 
  onSelect: (categoryId: string) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: isSelected ? category.color : undefined,
      }}
      className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
        isSelected
          ? 'text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      {...attributes}
    >
      <div 
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </div>
      <button
        type="button"
        onClick={() => onSelect(category._id)}
        className={`flex-1 text-left border-none outline-none ${isSelected ? 'text-white' : ''}`}
        style={{
          border: 'none',
          outline: 'none',
        }}
      >
        {category.name}
      </button>
    </div>
  );
}

export default function ExpenseForm({ onExpenseAdded }: ExpenseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Fetched categories with order:', data.map((cat: Category) => ({ name: cat.name, order: cat.order })));
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        // Refetch categories to get them in proper order
        await fetchCategories();
        setSelectedCategory(newCategory._id);
        setFormData(prev => ({ ...prev, description: newCategory.name }));
        setNewCategoryName('');
        setShowNewCategory(false);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const selectedCat = categories.find(cat => cat._id === categoryId);
    if (selectedCat) {
      setFormData(prev => ({ ...prev, description: selectedCat.name }));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update order in database
        updateCategoryOrder(newItems);
        
        return newItems;
      });
    }
  };

  const updateCategoryOrder = async (reorderedCategories: Category[]) => {
    try {
      const categoryOrders = reorderedCategories.map((category, index) => ({
        categoryId: category._id,
        order: index,
      }));

      const response = await fetch('/api/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryOrders }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating category order:', response.status, errorData);
        throw new Error(`Failed to update category order: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating category order:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData.amount) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: formData.amount,
          description: formData.description || categories.find(cat => cat._id === selectedCategory)?.name || 'Expense',
          categoryId: selectedCategory,
          date: selectedDate.toISOString(),
        }),
      });

      if (response.ok) {
        setFormData({ amount: '', description: '' });
        setSelectedCategory('');
        setIsOpen(false);
        onExpenseAdded();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-[50px] h-[50px] flex items-center justify-center shadow-lg z-40"
      >
        <Plus size={24} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add Expense</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700 p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
              <span className="text-xs text-gray-500 ml-2">(drag to reorder)</span>
            </label>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={categories.map(cat => cat._id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2 mb-2">
                  {categories.map((category) => (
                    <SortableCategory
                      key={category._id}
                      category={category}
                      isSelected={selectedCategory === category._id}
                      onSelect={handleCategorySelect}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="w-full px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 mt-2"
            >
              + New Category
            </button>

            {showNewCategory && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Category name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={createCategory}
                    className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName('');
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="Enter description (auto-filled from category)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedCategory}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
          >
            {isLoading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}