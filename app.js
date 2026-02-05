const API_URL = 'https://api.escuelajs.co/api/v1/products';

// State
let allProducts = [];
let displayedProducts = [];
let state = {
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    sort: { field: null, direction: 'asc' }
};

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

// Modals instances
const productDetailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
const createProductModal = new bootstrap.Modal(document.getElementById('createProductModal'));

function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        state.currentPage = 1;
        updateDisplayedProducts();
    });

    // Page Size
    document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
        state.itemsPerPage = parseInt(e.target.value);
        state.currentPage = 1;
        renderTable();
    });

    // Sorting
    document.getElementById('sortPriceBtn').addEventListener('click', () => toggleSort('price'));
    document.getElementById('sortTitleBtn').addEventListener('click', () => toggleSort('title'));

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
}

// Fetch Data
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('API Error');
        allProducts = await response.json();
        updateDisplayedProducts();
    } catch (error) {
        console.error(error);
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu!</td></tr>`;
    }
}

// Logic Filter & Sort
function updateDisplayedProducts() {
    // 1. Filter
    let result = allProducts.filter(p => p.title.toLowerCase().includes(state.searchQuery));

    // 2. Sort
    if (state.sort.field) {
        result.sort((a, b) => {
            let valA = a[state.sort.field];
            let valB = b[state.sort.field];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return state.sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return state.sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
        updateSortIcons();
    }

    displayedProducts = result;
    renderTable();
    renderPagination();
}

// Render Table
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    const pageData = displayedProducts.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">Không tìm thấy sản phẩm</td></tr>`;
        document.getElementById('paginationInfo').textContent = "0 entries";
        return;
    }

    pageData.forEach(product => {
        const imgUrl = CleanImageUrl(product.images);
        const row = document.createElement('tr');

        // Setup row click
        row.onclick = () => openProductDetail(product.id);

        // Escape content to prevent XSS
        const safeTitle = escapeHtml(product.title);
        const safeDesc = escapeHtml(product.description);

        row.innerHTML = `
            <td>${product.id}</td>
            <td><img src="${imgUrl}" alt="img" class="rounded" width="50" height="50" style="object-fit:cover;"></td>
            <td data-bs-toggle="tooltip" data-bs-placement="top" title="${safeDesc}">
                <span class="fw-bold">${safeTitle}</span>
            </td>
            <td>$${product.price}</td>
            <td><span class="badge bg-info text-dark">${product.category?.name || 'Unknown'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); openProductDetail(${product.id})">
                    <i class="fas fa-eye"></i> Detail
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Kích hoạt Bootstrap Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    document.getElementById('paginationInfo').textContent = `Showing ${start + 1}-${Math.min(end, displayedProducts.length)} of ${displayedProducts.length}`;
}

// Clean Image URL Helper
function CleanImageUrl(images) {
    if (!images || images.length === 0) return 'https://placehold.co/50';
    let url = images[0];
    // Fix API returning stringified array like '["url"]'
    if (typeof url === 'string' && url.startsWith('["')) {
        url = url.replace('["', '').replace('"]', '').replace('\"', '');
    }
    return url;
}

// Sort Helper
function toggleSort(field) {
    if (state.sort.field === field) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.field = field;
        state.sort.direction = 'asc';
    }
    updateDisplayedProducts();
}

function updateSortIcons() {
    const icon = state.sort.direction === 'asc' ? '<i class="fas fa-sort-up"></i>' : '<i class="fas fa-sort-down"></i>';
    document.getElementById('sortPriceBtn').innerHTML = `Price ${state.sort.field === 'price' ? icon : '<i class="fas fa-sort"></i>'}`;
    document.getElementById('sortTitleBtn').innerHTML = `Title ${state.sort.field === 'title' ? icon : '<i class="fas fa-sort"></i>'}`;
}

// --- Detail & Edit Logic ---
let currentProduct = null;

function openProductDetail(id) {
    // Find item
    currentProduct = allProducts.find(p => p.id === id);
    if (!currentProduct) return;

    // Fill View
    document.getElementById('detailTitle').textContent = currentProduct.title;
    document.getElementById('detailPrice').textContent = currentProduct.price;
    document.getElementById('detailCategory').textContent = currentProduct.category?.name || 'N/A';
    document.getElementById('detailDescription').textContent = currentProduct.description;
    document.getElementById('detailImage').src = CleanImageUrl(currentProduct.images);

    // Reset UI to View Mode
    document.getElementById('viewMode').classList.remove('d-none');
    document.getElementById('editForm').classList.add('d-none');
    document.getElementById('viewButtons').classList.remove('d-none');
    document.getElementById('editButtons').classList.add('d-none');
    document.getElementById('detailModalTitle').textContent = "Product Details";

    productDetailModal.show();
}

function enableEditMode() {
    // Switch to Edit Mode UI
    document.getElementById('viewMode').classList.add('d-none');
    document.getElementById('editForm').classList.remove('d-none');
    document.getElementById('viewButtons').classList.add('d-none');
    document.getElementById('editButtons').classList.remove('d-none');
    document.getElementById('detailModalTitle').textContent = "Edit Product";

    // Fill Form Data
    document.getElementById('editId').value = currentProduct.id;
    document.getElementById('editTitle').value = currentProduct.title;
    document.getElementById('editPrice').value = currentProduct.price;
    document.getElementById('editDescription').value = currentProduct.description;
}

function cancelEditMode() {
    // Revert logic
    document.getElementById('viewMode').classList.remove('d-none');
    document.getElementById('editForm').classList.add('d-none');
    document.getElementById('viewButtons').classList.remove('d-none');
    document.getElementById('editButtons').classList.add('d-none');
    document.getElementById('detailModalTitle').textContent = "Product Details";
}

// --- CORE FIX: SUBMIT UPDATE ---
async function submitUpdateProduct() {
    const id = document.getElementById('editId').value;

    // 1. Lấy dữ liệu từ form nhập liệu
    const title = document.getElementById('editTitle').value;
    const price = parseFloat(document.getElementById('editPrice').value);
    const description = document.getElementById('editDescription').value;

    // Validate nhanh
    if (!title || isNaN(price) || !description) {
        alert("Vui lòng nhập đầy đủ Title, Price và Description!");
        return;
    }

    // 2. Lấy lại categoryId và images từ sản phẩm hiện tại (currentProduct)
    // Vì form edit không có chỗ nhập ảnh và danh mục, ta phải lấy lại cái cũ.
    // Nếu không gửi kèm 2 cái này, API sẽ bị lỗi 500.

    // Kiểm tra an toàn cho category
    const categoryId = currentProduct.category ? currentProduct.category.id : 1;

    // Kiểm tra an toàn cho images (đảm bảo nó là 1 mảng)
    let images = ["https://placehold.co/640x480"]; // Ảnh mặc định nếu lỗi
    if (currentProduct.images && Array.isArray(currentProduct.images) && currentProduct.images.length > 0) {
        images = currentProduct.images;
    }

    // 3. Tạo payload đầy đủ
    const updateData = {
        title: title,
        price: price,
        description: description,
        categoryId: categoryId, // Quan trọng: Phải gửi kèm cái này
        images: images          // Quan trọng: Phải gửi kèm cái này
    };

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            // Nếu vẫn lỗi, in ra lỗi chi tiết từ server
            const errorData = await response.json();
            throw new Error(errorData.message || JSON.stringify(errorData));
        }

        const updatedProduct = await response.json();

        // 4. Cập nhật thành công -> Sửa lại dữ liệu trong mảng local để hiển thị ngay
        const index = allProducts.findIndex(p => p.id == id);
        if (index !== -1) {
            // Merge cái mới vào cái cũ để giữ tính nhất quán
            allProducts[index] = { ...allProducts[index], ...updatedProduct };
            updateDisplayedProducts(); // Vẽ lại bảng ngay lập tức
        }

        alert("Cập nhật thành công!");

        // Ẩn modal dùng Bootstrap instance
        const modalEl = document.getElementById('productDetailModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

    } catch (e) {
        console.error("Lỗi update:", e);
        // Nếu lỗi 500 vẫn xảy ra với sản phẩm cũ, gợi ý user
        if (e.message.includes("Internal server error")) {
            alert("Lỗi Server (500): Sản phẩm này bị lỗi dữ liệu gốc. Hãy thử Edit sản phẩm bạn vừa Tạo Mới xem sao!");
        } else {
            alert("Không thể cập nhật: " + e.message);
        }
    }
}

// --- Create Logic ---
async function submitCreateProduct() {
    const form = document.getElementById('createForm');
    const formData = new FormData(form);

    const newProduct = {
        title: formData.get('title'),
        price: parseFloat(formData.get('price')),
        description: formData.get('description'),
        categoryId: parseInt(formData.get('categoryId')),
        images: [formData.get('image')]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });

        if (!response.ok) throw new Error("Create failed");

        const data = await response.json();
        allProducts.unshift(data); // Add to top
        updateDisplayedProducts();

        alert("Tạo mới thành công!");
        form.reset();
        createProductModal.hide();
    } catch (e) {
        alert("Lỗi tạo mới: " + e.message);
    }
}

// Utility
function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Pagination Logic
function renderPagination() {
    const pagination = document.getElementById('paginationControls');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(displayedProducts.length / state.itemsPerPage);

    if (totalPages <= 1) return;

    // Prev
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${state.currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">Prev</a>`;
    prevLi.onclick = (e) => { e.preventDefault(); changePage(state.currentPage - 1); };
    pagination.appendChild(prevLi);

    // Numbers
    for (let i = 1; i <= totalPages; i++) {
        // Simple logic: Show all if small, or sliding window
        if (totalPages > 10 && Math.abs(state.currentPage - i) > 2 && i !== 1 && i !== totalPages) continue;

        const li = document.createElement('li');
        li.className = `page-item ${i === state.currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.onclick = (e) => { e.preventDefault(); changePage(i); };
        pagination.appendChild(li);
    }

    // Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${state.currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
    nextLi.onclick = (e) => { e.preventDefault(); changePage(state.currentPage + 1); };
    pagination.appendChild(nextLi);
}

function changePage(page) {
    const totalPages = Math.ceil(displayedProducts.length / state.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    state.currentPage = page;
    renderTable();
}

// Export CSV
function exportToCSV() {
    if (!displayedProducts.length) {
        alert("No data!");
        return;
    }
    const headers = ["ID", "Title", "Price", "Description"];
    const rows = displayedProducts.map(p => [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`,
        p.price,
        `"${p.description.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
    link.download = "products.csv";
    link.click();
}