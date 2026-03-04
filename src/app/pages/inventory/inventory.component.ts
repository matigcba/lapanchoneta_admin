import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from 'src/app/core/services/upload.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private uploadService = inject(UploadService);

  // Estados de carga
  loading = false;
  loadingTab = '';
  saving = false;
  uploading = false;
  uploadProgress = 0;

  // Tab activo
  activeTab = 'categories';

  // Datos para cada sección
  products: any[] = [];
  categories: any[] = [];
  combos: any[] = [];
  ingredients: any[] = [];
  sauces: any[] = [];
  toppings: any[] = [];

  // Datos filtrados
  filteredItems: any[] = [];

  // Búsqueda y filtros
  searchTerm = '';
  showInactive = false;

  // Modal
  showModal = false;
  editingItem = false;
  currentItem: any = {};

  // Upload de imagen
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  // Para combos
  comboProducts: any[] = [];

  // Sucursal actual
  currentBranchId: number | null = null;
  availableBranches: any[] = [];
  selectedBranches: number[] = [];

  // Environment para URLs
  environment = environment;

  // Caché de timestamps para imágenes
  private imageTimestamps = new Map<string, number>();

  // Para recetas
  recipeIngredients: any[] = [];
  showRecipeModal = false;
  editingProductId: number | null = null;
  calculatedCost: number = 0;
  calculatedPrice: number = 0;

  // En la sección de propiedades, agregar:
  calculatedComboCost: number = 0;
  calculatedComboStock: number = 0;

  // Configuración de tabs
  tabs = [
    { id: 'categories', label: 'Categorías', icon: 'bi-tags', color: '#f56565' },
    { id: 'products', label: 'Productos', icon: 'bi-box', color: '#667eea' },
    { id: 'ingredients', label: 'Ingredientes', icon: 'bi-egg-fried', color: '#ed8936' },
    { id: 'combos', label: 'Combos', icon: 'bi-collection', color: '#48bb78' },
    { id: 'sauces', label: 'Salsas', icon: 'bi-droplet-half', color: '#9f7aea' },
    { id: 'toppings', label: 'Aderezos', icon: 'bi-stars', color: '#38b2ac' }
  ];

  ngOnInit() {
    this.currentBranchId = this.productService.getCurrentBranch();

    this.authService.currentBranch$.subscribe(branch => {
      if (branch && branch.id !== this.currentBranchId) {
        this.currentBranchId = branch.id;
        this.onBranchChange();
      }
    });

    this.loadAvailableBranches();
    this.loadAllData();
  }

  loadAvailableBranches() {
    this.productService.getBranches().subscribe({
      next: (response) => {
        this.availableBranches = response.data || response || [];
        this.selectedBranches = this.availableBranches.map(b => b.id);
      }
    });
  }

  onBranchChange() {
    this.loadCategories();
    this.loadProducts();
    this.loadIngredients();
    this.loadCombos();
    this.loadSauces();
    this.loadToppings();
  }

  loadAllData() {
    this.loading = true;
    this.loadCategories();
    this.loadProducts();
    this.loadIngredients();
    this.loadCombos();
    this.loadSauces();
    this.loadToppings();

    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  loadProducts() {
    this.loadingTab = 'products';
    this.productService.getProducts(null, this.showInactive).subscribe({
      next: (response: any) => {
        console.log('Productos recibidos:', response);
        this.products = response?.data || response || [];
        if (this.activeTab === 'products') {
          this.filterItems();
        }
        this.loadingTab = '';
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.products = [];
        if (this.activeTab === 'products') {
          this.filterItems();
        }
        this.loadingTab = '';
      }
    });
  }

  loadCategories() {
    this.loadingTab = 'categories';
    this.productService.getCategories(false, this.showInactive).subscribe({
      next: (response: any) => {
        console.log('Categorías recibidas:', response);
        this.categories = response?.data || response || [];
        if (this.activeTab === 'categories') {
          this.filterItems();
        }
        this.loadingTab = '';
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.categories = [];
        if (this.activeTab === 'categories') {
          this.filterItems();
        }
        this.loadingTab = '';
      }
    });
  }

  loadIngredients() {
    this.loadingTab = 'ingredients';
    this.productService.getIngredients(this.showInactive).subscribe({
      next: (response: any) => {
        console.log('Ingredientes recibidos:', response);
        this.ingredients = response?.data || response || [];
        if (this.activeTab === 'ingredients') {
          this.filterItems();
        }
        this.loadingTab = '';
      },
      error: (error) => {
        console.error('Error cargando ingredientes:', error);
        this.ingredients = [];
        if (this.activeTab === 'ingredients') {
          this.filterItems();
        }
        this.loadingTab = '';
      }
    });
  }

  loadSauces() {
    this.loadingTab = 'sauces';
    // Reutilizar el endpoint de additionals con un filtro si es necesario
    this.productService.getSauces(this.showInactive).subscribe({
      next: (response: any) => {
        console.log('Salsas recibidas:', response);
        this.sauces = response?.data || response || [];
        if (this.activeTab === 'sauces') {
          this.filterItems();
        }
        this.loadingTab = '';
      },
      error: (error) => {
        console.error('Error cargando salsas:', error);
        this.sauces = [];
        if (this.activeTab === 'sauces') {
          this.filterItems();
        }
        this.loadingTab = '';
      }
    });
  }

  loadToppings() {
    this.loadingTab = 'toppings';
    // Reutilizar el endpoint de additionals con un filtro si es necesario
    this.productService.getToppings(this.showInactive).subscribe({
      next: (response: any) => {
        console.log('Aderezos recibidos:', response);
        this.toppings = response?.data || response || [];
        if (this.activeTab === 'toppings') {
          this.filterItems();
        }
        this.loadingTab = '';
      },
      error: (error) => {
        console.error('Error cargando aderezos:', error);
        this.toppings = [];
        if (this.activeTab === 'toppings') {
          this.filterItems();
        }
        this.loadingTab = '';
      }
    });
  }

  onShowInactiveChange() {
    console.log('🔄 Mostrar inactivos:', this.showInactive);

    this.loadCategories();
    this.loadProducts();
    this.loadIngredients();
    this.loadCombos();
    this.loadSauces();
    this.loadToppings();

    this.filterItems();

    console.log('✅ Datos recargados con filtro actualizado');
  }

  changeTab(tabId: string) {
    this.activeTab = tabId;
    this.searchTerm = '';

    // Cargar datos si es necesario
    if (tabId === 'combos' && this.combos.length === 0) {
      this.loadCombos();
    }

    this.filterItems();
  }

  filterItems() {
    let items = this.getItemsForTab();

    if (!Array.isArray(items)) {
      items = [];
    }

    if (this.searchTerm) {
      items = items.filter(item =>
        item.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredItems = items;
  }

  getItemsForTab(): any[] {
    switch (this.activeTab) {
      case 'products': return this.products || [];
      case 'categories': return this.categories || [];
      case 'combos': return this.combos || [];
      case 'ingredients': return this.ingredients || [];
      case 'sauces': return this.sauces || [];
      case 'toppings': return this.toppings || [];
      default: return [];
    }
  }

  getItemCountForTab(tabId: string): number {
    switch (tabId) {
      case 'products': return this.products?.length || 0;
      case 'categories': return this.categories?.length || 0;
      case 'combos': return this.combos?.length || 0;
      case 'ingredients': return this.ingredients?.length || 0;
      case 'sauces': return this.sauces?.length || 0;
      case 'toppings': return this.toppings?.length || 0;
      default: return 0;
    }
  }

  // ============================================
  // MÉTODOS DE RECETAS
  // ============================================

  openRecipeModal(product: any) {
    console.log('🔵 Abriendo receta para producto:', product);

    // CRÍTICO: Asegurarnos de que tenemos el ID
    if (!product || !product.id) {
      console.error('❌ Producto inválido o sin ID:', product);
      alert('Error: No se puede abrir la receta. Producto inválido.');
      return;
    }

    this.editingProductId = Number(product.id);
    console.log('✅ editingProductId seteado a:', this.editingProductId);

    this.showRecipeModal = true;

    // Cargar la receta
    this.loadProductRecipe(product.id);
  }

  openRecipeModalFromEdit() {
    console.log('🔵 Abriendo receta desde modal de edición');
    console.log('currentItem:', this.currentItem);

    if (!this.currentItem || !this.currentItem.id) {
      alert('Error: No se puede abrir la receta. Producto inválido.');
      return;
    }

    // Guardar referencia al producto ANTES de cerrar el modal
    const productToEdit = { ...this.currentItem };

    // Cerrar modal de edición
    this.closeModal();

    // Pequeño delay para que el modal se cierre primero
    setTimeout(() => {
      this.openRecipeModal(productToEdit);
    }, 300);
  }

  loadProductRecipe(productId: number) {
    this.loading = true;
    console.log('Cargando receta del producto:', productId);

    this.productService.getProductRecipe(productId).subscribe({
      next: (response) => {
        console.log('Respuesta de receta:', response);
        if (response.success) {
          this.recipeIngredients = response.data || [];
          this.calculateRecipeCost();

          if (this.recipeIngredients.length === 0) {
            this.addRecipeIngredient();
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando receta:', error);
        this.recipeIngredients = [];
        this.calculatedCost = 0;
        this.calculatedPrice = 0;
        this.addRecipeIngredient();
        this.loading = false;
      }
    });
  }

  addRecipeIngredient() {
    console.log('Agregando ingrediente a receta');
    this.recipeIngredients.push({
      ingredient_id: null,
      quantity: 1,
      unit: ''
    });
  }

  removeRecipeIngredient(index: number) {
    console.log('Removiendo ingrediente en índice:', index);
    this.recipeIngredients.splice(index, 1);
    this.calculateRecipeCost();
  }

  getRecipeItemCost(recipe: any): number {
    if (!recipe.ingredient_id || !recipe.quantity) return 0;

    const ingredient = this.ingredients.find(i => i.id == recipe.ingredient_id);
    if (!ingredient || !ingredient.cost) return 0;

    return recipe.quantity * ingredient.cost;
  }



  getIngredientUnit(ingredientId: number): string {
    if (!ingredientId) return '';

    const ingredient = this.ingredients.find(i => i.id == ingredientId);
    return ingredient?.unit || '';
  }

  calculateRecipeCost() {
    let totalCost = 0;

    this.recipeIngredients.forEach(recipe => {
      totalCost += this.getRecipeItemCost(recipe);
    });

    this.calculatedCost = totalCost;

    console.log('Costo calculado:', totalCost);
  }

  saveRecipe() {
    console.log('=== INICIANDO GUARDADO DE RECETA ===');
    console.log('editingProductId:', this.editingProductId);

    if (!this.editingProductId || this.editingProductId === undefined || this.editingProductId === null) {
      console.error('❌ editingProductId es inválido:', this.editingProductId);
      alert('Error: No se puede guardar la receta. ID de producto no encontrado.\n\nPor favor cierra este modal y vuelve a abrirlo.');
      return;
    }

    const productId = Number(this.editingProductId);

    if (isNaN(productId) || productId <= 0) {
      console.error('❌ productId no es un número válido:', productId);
      alert('Error: ID de producto inválido.');
      return;
    }

    const validIngredients = this.recipeIngredients.filter(
      r => r.ingredient_id && r.quantity > 0
    );

    console.log('Ingredientes válidos:', validIngredients);

    if (validIngredients.length === 0) {
      alert('Debe agregar al menos un ingrediente con cantidad');
      return;
    }

    this.saving = true;
    console.log('Llamando al servicio saveProductRecipe con productId:', productId);

    this.productService.saveProductRecipe(productId, validIngredients).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        if (response.success) {
          const msg = `Receta guardada correctamente.\n\n` +
            `Costo calculado: $${response.data.total_cost.toFixed(2)}\n` +
            `Stock disponible: ${response.data.calculated_stock} unidades\n\n` +
            `Precio actual: $${response.data.price.toFixed(2)}\n\n` +
            `El costo y stock se actualizarán automáticamente cuando cambien los ingredientes.`;
          alert(msg);
          this.closeRecipeModal();
          this.loadProducts(); // Recargar para ver el stock actualizado
          this.loadIngredients(); // Recargar ingredientes por si cambiaron
        } else {
          console.error('Respuesta sin éxito:', response);
          alert('Error: ' + (response.message || 'No se pudo guardar la receta'));
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('❌ Error completo:', error);
        let errorMsg = 'Error al guardar la receta';
        if (error.error?.message) {
          errorMsg += ': ' + error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        }
        alert(errorMsg);
        this.saving = false;
      }
    });
  }

  deleteRecipe() {
    console.log('=== INICIANDO ELIMINACIÓN DE RECETA ===');
    console.log('editingProductId:', this.editingProductId);

    if (!this.editingProductId || this.editingProductId === undefined || this.editingProductId === null) {
      console.error('❌ editingProductId es inválido:', this.editingProductId);
      alert('Error: No se puede eliminar la receta. ID de producto no encontrado.');
      return;
    }

    const productId = Number(this.editingProductId);

    if (isNaN(productId) || productId <= 0) {
      console.error('❌ productId no es un número válido:', productId);
      alert('Error: ID de producto inválido.');
      return;
    }

    if (!confirm('¿Está seguro de eliminar la receta de este producto?\n\nEsto volverá el producto a modo simple con costo y precio manual.')) {
      return;
    }

    this.saving = true;
    console.log('Llamando al servicio deleteProductRecipe con productId:', productId);

    this.productService.deleteProductRecipe(productId).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        if (response.success) {
          alert('Receta eliminada correctamente.\n\nEl producto ahora tiene precio y costo manual.');
          this.closeRecipeModal();
          this.loadProducts();
        } else {
          console.error('Respuesta sin éxito:', response);
          alert('Error: ' + (response.message || 'No se pudo eliminar la receta'));
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('❌ Error completo:', error);

        let errorMsg = 'Error al eliminar la receta';
        if (error.error?.message) {
          errorMsg += ': ' + error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        }

        alert(errorMsg);
        this.saving = false;
      }
    });
  }

  closeRecipeModal() {
    this.showRecipeModal = false;
    this.editingProductId = null;
    this.recipeIngredients = [];
    this.calculatedCost = 0;
    this.calculatedPrice = 0;
  }

  // ============================================
  // MÉTODOS DE MODAL CREAR/EDITAR
  // ============================================

  openModal() {
    this.currentItem = this.getEmptyItem();
    this.editingItem = false;
    this.showModal = true;
    this.selectedFile = null;
    this.imagePreview = null;
    this.uploadProgress = 0;

    if (this.activeTab === 'products') {
      this.loadCategoriesForCurrentBranch();
    }

    // Inicializar sucursales seleccionadas - SIEMPRE incluir la actual
    this.selectedBranches = this.availableBranches.map(b => b.id);

    // Asegurar que la actual esté incluida
    if (!this.selectedBranches.includes(this.currentBranchId!)) {
      this.selectedBranches.push(this.currentBranchId!);
    }

    if (this.activeTab === 'combos') {
      this.comboProducts = [{ product_id: '', quantity: 1 }];
      this.calculatedComboCost = 0;
      this.calculatedComboStock = 0;
    }

    console.log('📋 Modal abierto - Sucursales seleccionadas:', this.selectedBranches);
  }
  loadCategoriesForCurrentBranch() {
    this.productService.getCategories().subscribe({
      next: (response: any) => {
        this.categories = response?.data || response || [];
      }
    });
  }

  editItem(item: any) {
    console.log('✏️ Editando item:', item);

    this.currentItem = {
      ...item,
      category_id: item.category_id || item.category?.id || null,
      has_recipe: item.has_recipe || false
    };

    this.editingItem = true;
    this.showModal = true;
    this.selectedFile = null;
    this.imagePreview = null;
    this.uploadProgress = 0;
    this.selectedBranches = [this.currentBranchId!];

    if (item.image) {
      this.refreshImageTimestamp(item.image);
    }

    if (this.activeTab === 'products' && this.categories.length === 0) {
      this.loadCategoriesForCurrentBranch();
    }

    if (this.activeTab === 'combos' && item.products) {
      this.comboProducts = item.products.map((p: any) => ({
        product_id: p.product_id,
        quantity: p.quantity
      }));
      // Calcular costo y stock al editar
      setTimeout(() => {
        this.calculateComboCost();
      }, 100);
    }

    console.log('✅ currentItem después de editar:', this.currentItem);
  }

  isLowStock(productId: any, quantity: any): boolean {
    const stock = this.getProductStock(productId);
    const qty = quantity || 0;
    return stock < qty;
  }

  // Agregar estos métodos en la sección de MÉTODOS PARA COMBOS

  hasValidProducts(): boolean {
    return this.comboProducts.some(p => p.product_id);
  }

  getQuantityOrZero(quantity: any): number {
    return quantity || 0;
  }

  closeModal() {
    this.showModal = false;
    this.currentItem = {};
    this.comboProducts = [];
    this.selectedFile = null;
    this.imagePreview = null;
    this.uploadProgress = 0;
    this.saving = false;
    this.uploading = false;

    const fileInput = document.getElementById('imageInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  async saveItem() {
  if (!this.validateItem()) {
    if (this.activeTab === 'products' && this.currentItem.has_recipe) {
      alert('Por favor complete: Nombre y Categoría.\n\nLos ingredientes se pueden agregar después de guardar.');
    } else {
      alert('Por favor complete los campos requeridos');
    }
    return;
  }

  // Validación de sucursales (para categorías, productos, salsas y aderezos)
  if (!this.editingItem && (this.activeTab === 'categories' || this.activeTab === 'products' || this.activeTab === 'sauces' || this.activeTab === 'toppings')) {
    if (this.selectedBranches.length === 0) {
      alert('Debe seleccionar al menos una sucursal');
      return;
    }

    // Asegurar que la sucursal actual esté incluida
    if (!this.selectedBranches.includes(this.currentBranchId!)) {
      this.selectedBranches.push(this.currentBranchId!);
    }
  }

  this.saving = true;

  try {
    let dataToSend = { ...this.currentItem };

    // Manejo de sucursales para nuevos items
    if (!this.editingItem) {
      if (this.activeTab === 'products' && this.currentItem.has_recipe) {
        // Producto con receta - Solo sucursal actual
        console.log('🥚 Producto con receta - Solo sucursal actual');
        dataToSend.branch_id = this.currentBranchId;
        delete dataToSend.branches;
      } else if (this.activeTab === 'categories' || this.activeTab === 'products' || this.activeTab === 'sauces' || this.activeTab === 'toppings') {
        // Categorías, productos sin receta, salsas y aderezos - Múltiples sucursales
        console.log('📦 Creando en múltiples sucursales:', this.selectedBranches);
        dataToSend.branches = this.selectedBranches;
        dataToSend.branch_id = this.currentBranchId; // También enviar branch_id actual
      }
    } else {
      dataToSend.branch_id = this.currentBranchId;
    }

    // Combos
    if (this.activeTab === 'combos') {
      dataToSend.products = this.comboProducts.filter(p => p.product_id);
    }

    const request = this.editingItem
      ? this.updateItemWithData(dataToSend)
      : this.createItemWithData(dataToSend);

    request.subscribe({
      next: async (response) => {
        console.log('📦 Respuesta del servidor:', response);

        // ========================================
        // OBTENER EL ID CORRECTAMENTE
        // ========================================
        let itemId: number | null = null;

        if (this.editingItem) {
          itemId = this.currentItem.id;
        } else {
          // Prioridad: data.id > created_ids_by_branch > created_ids[0] > id
          if (response.data?.id) {
            itemId = response.data.id;
            console.log('📌 ID obtenido de data.id:', itemId);
          } else if (response.created_ids_by_branch && response.created_ids_by_branch[this.currentBranchId!]) {
            itemId = response.created_ids_by_branch[this.currentBranchId!];
            console.log('📌 ID obtenido de created_ids_by_branch:', itemId);
          } else if (response.created_ids && response.created_ids.length > 0) {
            itemId = response.created_ids[0];
            console.log('📌 ID obtenido de created_ids[0]:', itemId);
          } else if (response.id) {
            itemId = response.id;
            console.log('📌 ID obtenido de id:', itemId);
          }
        }

        console.log('✅ Item ID final:', itemId);

        // ========================================
        // SUBIR IMAGEN SI EXISTE
        // ========================================
        if (this.selectedFile && itemId) {
          console.log('📸 Subiendo imagen para item ID:', itemId);
          const imageUrl = await this.uploadImage(itemId);

          if (imageUrl) {
            console.log('✅ Imagen subida:', imageUrl);

            const updateData = {
              ...dataToSend,
              id: itemId,
              image: imageUrl,
              branch_id: this.currentBranchId
            };

            this.updateItemWithData(updateData).subscribe({
              next: () => {
                console.log('✅ URL de imagen actualizada en el item');

                if (this.activeTab === 'combos') {
                  this.reloadComboFromServer(itemId!);
                } else {
                  this.updateItemInList(itemId!, { ...updateData, image: imageUrl });
                }

                this.closeModal();

                if (!this.editingItem && this.activeTab === 'products' && this.currentItem.has_recipe) {
                  this.promptAddRecipe(itemId!);
                } else {
                  this.showSuccessMessage();
                }

                this.saving = false;
              },
              error: (error) => {
                console.error('Error actualizando URL de imagen:', error);
                this.loadDataForCurrentTab();
                this.closeModal();
                alert('Item guardado pero hubo un error al vincular la imagen');
                this.saving = false;
              }
            });
          } else {
            this.loadDataForCurrentTab();
            this.closeModal();
            alert('Item guardado pero hubo un error al subir la imagen');
            this.saving = false;
          }
        } else {
          // ========================================
          // SIN IMAGEN PARA SUBIR
          // ========================================
          if (this.activeTab === 'combos' && itemId) {
            try {
              await this.reloadComboFromServer(itemId);
            } catch (error) {
              console.error('Error recargando combo:', error);
            }
          } else if (itemId) {
            this.updateItemInList(itemId, dataToSend);
          }

          this.closeModal();

          if (response.errors && response.errors.length > 0) {
            alert('Creado con advertencias:\n' + response.errors.join('\n'));
          } else {
            if (!this.editingItem && this.activeTab === 'products' && this.currentItem.has_recipe) {
              this.promptAddRecipe(itemId!);
            } else {
              this.showSuccessMessage();
            }
          }

          this.saving = false;
        }
      },
      error: (error) => {
        console.error('Error:', error);
        alert(error.error?.message || 'Error al guardar. Por favor intente nuevamente.');
        this.saving = false;
      }
    });
  } catch (error) {
    console.error('Error:', error);
    alert('Error inesperado al guardar');
    this.saving = false;
  }
}

  reloadComboFromServer(comboId: number): Promise<void> {
    console.log('🔄 Recargando combo desde servidor:', comboId);

    return new Promise((resolve, reject) => {
      this.productService.getComboById(comboId).subscribe({
        next: (response: any) => {
          const comboData = response?.data || response;
          console.log('✅ Combo recargado con datos actualizados:', comboData);

          // Actualizar en la lista local
          const index = this.combos.findIndex(c => c.id === comboId);
          if (index !== -1) {
            this.combos[index] = comboData;
          } else {
            this.combos.push(comboData);
          }

          // Actualizar la lista filtrada
          this.combos = [...this.combos];
          this.filterItems();

          resolve();
        },
        error: (error) => {
          console.error('❌ Error recargando combo:', error);
          // Si falla, recargar toda la lista
          this.loadCombos();
          reject(error);
        }
      });
    });
  }
  promptAddRecipe(productId: number) {
    const wantsToAddRecipe = confirm(
      '✅ Producto con receta creado correctamente.\n\n' +
      '¿Deseas agregar los ingredientes de la receta ahora?\n\n' +
      '(El stock se calculará automáticamente según los ingredientes disponibles)'
    );

    if (wantsToAddRecipe) {
      this.loadProducts();

      setTimeout(() => {
        const newProduct = this.products.find(p => p.id === productId);
        if (newProduct) {
          console.log('Abriendo receta para producto:', newProduct);
          this.openRecipeModal(newProduct);
        } else {
          console.error('No se encontró el producto:', productId);
          alert('Producto creado correctamente. Puedes agregar la receta desde el botón 🥚 en la tabla.');
        }
      }, 500);
    } else {
      this.showSuccessMessage();
    }
  }

  updateItemInList(itemId: number, updatedData: any) {
    let items: any[] = [];

    switch (this.activeTab) {
      case 'products': items = this.products; break;
      case 'categories': items = this.categories; break;
      case 'combos': items = this.combos; break;
      case 'ingredients': items = this.ingredients; break;
      case 'sauces': items = this.sauces; break;
      case 'toppings': items = this.toppings; break;
    }

    const index = items.findIndex(item => item.id === itemId);

    if (index !== -1) {
      if (this.activeTab === 'products' && updatedData.category_id) {
        const category = this.categories.find(cat => cat.id == updatedData.category_id);
        if (category) {
          updatedData.category_name = category.name;
        }
      }

      items[index] = { ...items[index], ...updatedData };

      if (updatedData.image) {
        this.refreshImageTimestamp(updatedData.image);
      }
    } else {
      if (this.activeTab === 'products' && updatedData.category_id) {
        const category = this.categories.find(cat => cat.id == updatedData.category_id);
        if (category) {
          updatedData.category_name = category.name;
        }
      }

      items.push({ id: itemId, ...updatedData });

      if (updatedData.image) {
        this.refreshImageTimestamp(updatedData.image);
      }
    }

    switch (this.activeTab) {
      case 'products': this.products = [...items]; break;
      case 'categories': this.categories = [...items]; break;
      case 'combos': this.combos = [...items]; break;
      case 'ingredients': this.ingredients = [...items]; break;
      case 'sauces': this.sauces = [...items]; break;
      case 'toppings': this.toppings = [...items]; break;
    }

    this.filterItems();
  }


  createItemWithData(data: any) {
    switch (this.activeTab) {
      case 'products': return this.productService.createProduct(data);
      case 'categories': return this.productService.createCategory(data);
      case 'combos': return this.productService.createCombo(data);
      case 'ingredients': return this.productService.createIngredient(data);
      case 'sauces': return this.productService.createSauce(data);
      case 'toppings': return this.productService.createTopping(data);
      default: throw new Error('Tab no válido');
    }
  }

  updateItemWithData(data: any) {
    const id = data.id;
    switch (this.activeTab) {
      case 'products': return this.productService.updateProduct(id, data);
      case 'categories': return this.productService.updateCategory(id, data);
      case 'combos': return this.productService.updateCombo(id, data);
      case 'ingredients': return this.productService.updateIngredient(id, data);
      case 'sauces': return this.productService.updateSauce(id, data);
      case 'toppings': return this.productService.updateTopping(id, data);
      default: throw new Error('Tab no válido');
    }
  }

  deleteItem(item: any) {
    if (!confirm(`¿Está seguro de eliminar "${item.name}"?`)) {
      return;
    }

    this.getDeleteRequest(item).subscribe({
      next: () => {
        this.loadDataForCurrentTab();
        this.showDeleteMessage();
      },
      error: (error) => {
        console.error('Error:', error);
        alert('Error al eliminar. Verifique que no tenga dependencias.');
      }
    });
  }
  onRecipeToggleChange() {
    console.log('🔄 Toggle de receta cambiado:', this.currentItem.has_recipe);

    if (this.currentItem.has_recipe) {
      this.currentItem.cost = 0; // El costo se calculará por receta
      this.currentItem.stock = 0; // El stock se calcula por receta

      this.selectedBranches = [this.currentBranchId!];
      console.log('✅ Producto con receta: costo=0, stock=0 (automático), precio manual, sucursal actual');
    } else {
      this.selectedBranches = this.availableBranches.map(b => b.id);
      console.log('✅ Producto sin receta: todas las sucursales habilitadas');
    }
  }

  getCurrentBranchName(): string {
    const currentBranch = this.availableBranches.find(b => b.id === this.currentBranchId);
    return currentBranch ? currentBranch.name : 'Sucursal actual';
  }

  validateItem(): boolean {
    switch (this.activeTab) {
      case 'products':
        return !!(this.currentItem.name && this.currentItem.category_id && this.currentItem.price);
      case 'categories':
        return !!this.currentItem.name;
      case 'combos':
        return !!(this.currentItem.name && this.currentItem.price && this.comboProducts.some(p => p.product_id));
      case 'ingredients':
        // Ingredientes solo requieren nombre (el costo es opcional)
        return !!this.currentItem.name;
      default:
        return !!this.currentItem.name;
    }
  }


  getDeleteRequest(item: any) {
    switch (this.activeTab) {
      case 'products': return this.productService.deleteProduct(item.id);
      case 'categories': return this.productService.deleteCategory(item.id);
      case 'combos': return this.productService.deleteCombo(item.id);
      case 'ingredients': return this.productService.deleteIngredient(item.id);
      case 'sauces': return this.productService.deleteSauce(item.id);
      case 'toppings': return this.productService.deleteTopping(item.id);
      default: throw new Error('Tab no válido');
    }
  }
  loadDataForCurrentTab() {
    this.clearImageCache();

    switch (this.activeTab) {
      case 'products': this.loadProducts(); break;
      case 'categories': this.loadCategories(); break;
      case 'combos': this.loadCombos(); break;
      case 'ingredients': this.loadIngredients(); break;
      case 'sauces': this.loadSauces(); break;
      case 'toppings': this.loadToppings(); break;
    }
  }

  getProductPrice(productId: any): number {
    if (!productId) return 0;
    const product = this.products.find(p => p.id == productId);
    return product ? (product.price || 0) : 0;
  }

  loadCombos() {
    this.loadingTab = 'combos';
    this.productService.getCombos(this.showInactive).subscribe({
      next: (response: any) => {
        console.log('Combos recibidos:', response);
        this.combos = response?.data || response || [];

        // Filtrar según showInactive si es necesario
        if (!this.showInactive) {
          this.combos = this.combos.filter((c: any) => c.is_active);
        }

        if (this.activeTab === 'combos') {
          this.filterItems();
        }
        this.loadingTab = '';
      },
      error: (error) => {
        console.error('Error cargando combos:', error);
        this.combos = [];
        if (this.activeTab === 'combos') {
          this.filterItems();
        }
        this.loadingTab = '';
      }
    });
  }


  getEmptyItem(): any {
    const base = {
      name: '',
      description: '',
      is_active: true
    };

    switch (this.activeTab) {
      case 'products':
        return {
          ...base,
          cost: 0,
          price: 0,
          stock: 0,
          min_stock: 0,
          category_id: null,
          has_recipe: false
        };
      case 'categories':
        return { ...base, display_order: 0 };
      case 'combos':
        return { ...base, price: 0 };
      case 'ingredients':
        return { ...base, stock: 0, min_stock: 0, unit: '', cost: 0 };
      case 'sauces':
      case 'toppings':
        return { ...base, stock: 0, min_stock: 0 };
      default:
        return base;
    }
  }
  toggleBranch(branchId: number) {
    // La sucursal actual NO puede destildarse nunca
    if (branchId === this.currentBranchId) {
      console.log('⚠️ No se puede desmarcar la sucursal actual');
      return;
    }

    const index = this.selectedBranches.indexOf(branchId);
    if (index > -1) {
      this.selectedBranches.splice(index, 1);
    } else {
      this.selectedBranches.push(branchId);
    }
  }

  toggleStatus(item: any) {
    item.is_active = !item.is_active;
    this.currentItem = item;
    this.updateItem().subscribe({
      next: () => {
        this.loadDataForCurrentTab();
      }
    });
  }

  updateItem() {
    const id = this.currentItem.id;
    switch (this.activeTab) {
      case 'products': return this.productService.updateProduct(id, this.currentItem);
      case 'categories': return this.productService.updateCategory(id, this.currentItem);
      case 'combos': return this.productService.updateCombo(id, this.currentItem);
      case 'ingredients': return this.productService.updateIngredient(id, this.currentItem);
      case 'sauces': return this.productService.updateSauce(id, this.currentItem);
      case 'toppings': return this.productService.updateTopping(id, this.currentItem);
      default: throw new Error('Tab no válido');
    }
  }

  addComboProduct() {
    this.comboProducts.push({ product_id: '', quantity: 1 });
  }

  removeComboProduct(index: number) {
    this.comboProducts.splice(index, 1);
  }

  // ============================================
  // MÉTODOS DE IMÁGENES
  // ============================================

  getImageUrl(image: string | null): string {
    if (!image) return '';

    if (image.startsWith('http') || image.startsWith('data:')) {
      return image;
    }

    const imagePath = image.startsWith('/') ? image : '/' + image;

    if (!this.imageTimestamps.has(imagePath)) {
      this.imageTimestamps.set(imagePath, new Date().getTime());
    }

    const timestamp = this.imageTimestamps.get(imagePath);

    let baseUrl = environment.apiUrl;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4);
    }

    return `${baseUrl}${imagePath}?t=${timestamp}`;
  }

  getImageUrlWithFallback(image: string | null): string {
    const url = this.getImageUrl(image);
    return url || 'assets/no-image.png';
  }

  refreshImageTimestamp(imagePath: string) {
    if (imagePath) {
      const path = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
      this.imageTimestamps.set(path, new Date().getTime());
    }
  }

  clearImageCache() {
    this.imageTimestamps.clear();
  }

  onImageError(event: any) {
    event.target.src = 'assets/no-image.png';
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const validation = this.uploadService.validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
    this.currentItem.image = null;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async uploadImage(itemId: number): Promise<string | null> {
    if (!this.selectedFile) return null;

    return new Promise((resolve) => {
      this.uploading = true;

      this.uploadService.uploadImageSimple(this.selectedFile!, itemId, this.activeTab).subscribe({
        next: (response) => {
          this.uploading = false;
          if (response?.success) {
            this.refreshImageTimestamp(response.data.url);
            resolve(response.data.url);
          } else {
            alert(response?.message || 'Error al subir imagen');
            resolve(null);
          }
        },
        error: (error) => {
          console.error('Error:', error);
          this.uploading = false;
          alert('Error al subir la imagen');
          resolve(null);
        }
      });
    });
  }

  removeImage() {
    if (this.currentItem.image && !this.imagePreview && !this.isNoImage(this.currentItem.image)) {
      if (confirm('¿Eliminar imagen actual?')) {
        const imageToDelete = this.currentItem.image;

        this.uploadService.deleteImage(imageToDelete).subscribe({
          next: () => {
            this.imageTimestamps.delete(imageToDelete);
            this.currentItem.image = null;
            this.imagePreview = null;
            this.selectedFile = null;

            const fileInput = document.getElementById('imageInput') as HTMLInputElement;
            if (fileInput) {
              fileInput.value = '';
            }

            this.currentItem = { ...this.currentItem };
            alert('Imagen eliminada correctamente');
          },
          error: (error) => {
            console.error('Error eliminando imagen:', error);
            alert('Error al eliminar la imagen');
          }
        });
      }
    } else {
      this.currentItem.image = null;
      this.imagePreview = null;
      this.selectedFile = null;

      const fileInput = document.getElementById('imageInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      this.currentItem = { ...this.currentItem };
    }
  }

  isNoImage(image: string | null): boolean {
    if (!image) return true;
    return image.includes('no-image.png') || image.includes('assets/no-image');
  }

  handleImagePreviewError(event: any) {
    event.target.style.display = 'none';
    this.currentItem.image = null;

    setTimeout(() => {
      this.currentItem = { ...this.currentItem };
    }, 0);
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  showSuccessMessage() {
    alert(`${this.getTabLabel()} ${this.editingItem ? 'actualizado' : 'creado'} correctamente`);
  }

  showDeleteMessage() {
    alert(`${this.getTabLabel()} eliminado correctamente`);
  }

  getTabLabel(): string {
    return this.tabs.find(t => t.id === this.activeTab)?.label || '';
  }

  getStockStatus(item: any): string {
    if (item.stock === undefined || item.stock === null || !item.min_stock) {
      return 'normal';
    }

    if (item.stock === 0 || item.stock <= item.min_stock) {
      return 'critical';
    }

    if (item.stock <= item.min_stock * 1.5) {
      return 'warning';
    }

    return 'normal';
  }

  getWarningStockCount(): number {
    if (!Array.isArray(this.filteredItems)) return 0;

    return this.filteredItems.filter(item => {
      const status = this.getStockStatus(item);
      return status === 'warning' || status === 'critical';
    }).length;
  }

  getActiveItemsCount(): number {
    if (!Array.isArray(this.filteredItems)) return 0;
    return this.filteredItems.filter(i => i.is_active).length;
  }

  selectAllBranches() {
    this.selectedBranches = this.availableBranches.map(b => b.id);
  }

  clearBranches() {
    this.selectedBranches = [this.currentBranchId!];
  }

  onComboProductChange(index: number) {
    console.log('Producto del combo cambiado en índice:', index);
    this.calculateComboCost();
  }

  calculateComboCost() {
    let totalCost = 0;
    let minStock = Infinity;

    this.comboProducts.forEach(cp => {
      if (cp.product_id && cp.quantity) {
        const product = this.products.find(p => p.id == cp.product_id);
        if (product) {
          // Calcular costo
          totalCost += (cp.quantity * (product.cost || 0));

          // Calcular stock mínimo posible
          const productStock = product.stock || 0;
          const possibleCombos = Math.floor(productStock / cp.quantity);
          minStock = Math.min(minStock, possibleCombos);
        }
      }
    });

    this.calculatedComboCost = totalCost;
    this.calculatedComboStock = minStock === Infinity ? 0 : minStock;

    console.log('Costo del combo calculado:', this.calculatedComboCost);
    console.log('Stock del combo calculado:', this.calculatedComboStock);
  }

  getProductName(productId: any): string {
    if (!productId) return '';
    const product = this.products.find(p => p.id == productId);
    return product ? product.name : '';
  }

  getProductCost(productId: any): number {
    if (!productId) return 0;
    const product = this.products.find(p => p.id == productId);
    return product ? (product.cost || 0) : 0;
  }

  getProductStock(productId: any): number {
    if (!productId) return 0;
    const product = this.products.find(p => p.id == productId);
    return product ? (product.stock || 0) : 0;
  }

  getProductImage(productId: any): string {
    if (!productId) return 'assets/no-image.png';
    const product = this.products.find(p => p.id == productId);
    if (!product || !product.image) return 'assets/no-image.png';
    return this.getImageUrlWithFallback(product.image);
  }


  isBranchDisabled(branchId: number): boolean {
    // La sucursal actual SIEMPRE está deshabilitada (no se puede desmarcar)
    if (branchId === this.currentBranchId) {
      return true;
    }

    // Para productos con receta, todas las demás están deshabilitadas
    if (this.activeTab === 'products' && this.currentItem.has_recipe) {
      return true;
    }

    return false;
  }

}