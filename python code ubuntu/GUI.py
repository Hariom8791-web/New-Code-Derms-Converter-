import tkinter as tk
from tkinter import ttk, messagebox
from backend import (
    load_config, save_config, launch_node, get_node_status,
    get_all_nodes, delete_node, node_logs
)

class NodeManagerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Multi-Node Modbus Dashboard")
        self.root.geometry("1100x600")
        
        self.create_dashboard()
        self.load_existing_nodes()
        self.auto_refresh()

    def create_dashboard(self):
        """Create the main dashboard interface"""
        control_frame = tk.Frame(self.root)
        control_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        tk.Button(
            control_frame,
            text="Add Node",
            command=self.open_add_node_window,
            width=15
        ).pack(side=tk.LEFT, padx=5)
        
        tk.Button(
            control_frame,
            text="Delete Node",
            command=self.delete_selected_node,
            width=15
        ).pack(side=tk.LEFT, padx=5)
        
        cols = ("NODE_ID", "IP:PORT", "SENSORS", "STATUS", "LOG", "SITE")
        self.tree = ttk.Treeview(
            self.root,
            columns=cols,
            show='headings',
            height=20,
            selectmode='browse'
        )
        
        col_widths = [100, 150, 250, 100, 100, 200]
        for col, width in zip(cols, col_widths):
            self.tree.heading(col, text=col)
            self.tree.column(col, width=width, anchor=tk.CENTER if col not in ("SENSORS", "SITE") else tk.W)
        
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=self.tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.tree.bind("<Double-1>", self.show_log_window)
        self.tree.bind("<Button-3>", self.on_right_click)

    def on_right_click(self, event):
        """Handle right-click to edit site"""
        item = self.tree.identify_row(event.y)
        col = self.tree.identify_column(event.x)
        
        if item and col == "#6":  # Site column
            node_id = self.tree.item(item)['values'][0]
            current_site = self.tree.item(item)['values'][5]
            
            # Create popup entry
            popup = tk.Toplevel(self.root)
            popup.title(f"Edit Site for {node_id}")
            popup.geometry("300x100")
            
            tk.Label(popup, text="Site Name:").pack(pady=5)
            site_entry = tk.Entry(popup, width=30)
            site_entry.pack(pady=5)
            site_entry.insert(0, current_site)
            site_entry.focus_set()
            
            def save_site():
                new_site = site_entry.get()
                self.tree.set(item, column="SITE", value=new_site)
                
                # Update config
                nodes_config = get_all_nodes()
                if node_id in nodes_config:
                    nodes_config[node_id]['site'] = new_site
                    save_config()
                
                popup.destroy()
            
            tk.Button(popup, text="Save", command=save_site).pack(pady=5)

    def load_existing_nodes(self):
        """Load existing nodes from config file"""
        load_config()
        for node_id, cfg in get_all_nodes().items():
            launch_node(node_id, cfg)
        self.refresh_dashboard()

    def open_add_node_window(self):
        """Open window to add a new node"""
        win = tk.Toplevel(self.root)
        win.title("Add New Node")
        win.grab_set()
        
        # Form fields
        fields = [
            ("Node ID:", 0),
            ("Site:", 1),
            ("Modbus IP:", 2),
            ("Modbus Port:", 3)
        ]
        
        entries = {}
        for label, row in fields:
            tk.Label(win, text=label).grid(row=row, column=0, sticky="e", padx=5, pady=2)
            entry = tk.Entry(win)
            entry.grid(row=row, column=1, sticky="we", padx=5, pady=2)
            entries[label] = entry
        
        entries["Modbus Port:"].insert(0, "502")
        
        # Sensor configuration
        tk.Label(win, text="Sensors:").grid(row=4, column=0, sticky="ne", padx=5, pady=5)
        
        sensor_frame = tk.Frame(win)
        sensor_frame.grid(row=4, column=1, sticky="nsew", padx=5, pady=5)
        
        sensor_cols = ("Type", "Name", "Slave ID", "Address", "Details")
        self.sensor_tree = ttk.Treeview(
            sensor_frame,
            columns=sensor_cols,
            show='headings',
            height=5
        )
        
        for col in sensor_cols:
            self.sensor_tree.heading(col, text=col)
            self.sensor_tree.column(col, width=80, anchor=tk.CENTER)
        
        self.sensor_tree.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(sensor_frame, orient="vertical", command=self.sensor_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.sensor_tree.configure(yscrollcommand=scrollbar.set)
        
        button_frame = tk.Frame(sensor_frame)
        button_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=5)
        
        tk.Button(
            button_frame,
            text="Add RES Sensor",
            command=lambda: self.add_res_sensor(win)
        ).pack(side=tk.LEFT, padx=2)
        
        tk.Button(
            button_frame,
            text="Add NER Sensor",
            command=lambda: self.add_ner_sensor(win)
        ).pack(side=tk.LEFT, padx=2)
        
        tk.Button(
            button_frame,
            text="Remove Sensor",
            command=self.remove_sensor
        ).pack(side=tk.RIGHT, padx=2)
        
        tk.Button(
            win,
            text="Save & Start Node",
            command=lambda: self.save_new_node(
                win,
                entries["Node ID:"].get(),
                entries["Site:"].get(),
                entries["Modbus IP:"].get(),
                entries["Modbus Port:"].get()
            )
        ).grid(row=5, column=0, columnspan=2, pady=10)
        
        win.grid_columnconfigure(1, weight=1)
        win.grid_rowconfigure(4, weight=1)

    def add_res_sensor(self, parent_window):
        """Add a RES sensor to the configuration"""
        win = tk.Toplevel(parent_window)
        win.title("Add RES Sensor")
        win.grab_set()
        
        slave_id_var = tk.StringVar()
        name_var = tk.StringVar()
        addr_var = tk.StringVar(value="1")
        count_var = tk.StringVar(value="1")
        
        tk.Label(win, text="Slave ID:").grid(row=0, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=slave_id_var).grid(row=0, column=1, padx=5, pady=2)
        
        tk.Label(win, text="Sensor Name:").grid(row=1, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=name_var).grid(row=1, column=1, padx=5, pady=2)
        
        tk.Label(win, text="Register Address:").grid(row=2, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=addr_var).grid(row=2, column=1, padx=5, pady=2)
        
        tk.Label(win, text="Register Count:").grid(row=3, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=count_var).grid(row=3, column=1, padx=5, pady=2)
        
        def save_sensor():
            try:
                slave_id = int(slave_id_var.get())
                name = name_var.get()
                address = int(addr_var.get())
                count = int(count_var.get())
                
                if not name:
                    raise ValueError("Sensor name is required")
                
                self.sensor_tree.insert('', tk.END, values=(
                    "RES",
                    name,
                    slave_id,
                    f"0x{address:04X}",
                    f"Count: {count}"
                ))
                win.destroy()
            except ValueError as e:
                messagebox.showerror("Error", f"Invalid input: {str(e)}")
        
        tk.Button(win, text="Save", command=save_sensor).grid(row=4, column=0, columnspan=2, pady=5)

    def add_ner_sensor(self, parent_window):
        """Add a NER sensor to the configuration"""
        win = tk.Toplevel(parent_window)
        win.title("Add NER Sensor")
        win.grab_set()
        
        slave_id_var = tk.StringVar()
        addr_var = tk.StringVar(value="0")
        count_var = tk.StringVar(value="20")
        pos_var = tk.StringVar(value="2")
        
        tk.Label(win, text="Slave ID:").grid(row=0, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=slave_id_var).grid(row=0, column=1, padx=5, pady=2)
        
        tk.Label(win, text="Start Address:").grid(row=1, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=addr_var).grid(row=1, column=1, padx=5, pady=2)
        
        tk.Label(win, text="Register Count:").grid(row=2, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=count_var).grid(row=2, column=1, padx=5, pady=2)
        
        tk.Label(win, text="NER Position:").grid(row=3, column=0, padx=5, pady=2)
        tk.Entry(win, textvariable=pos_var).grid(row=3, column=1, padx=5, pady=2)
        
        def save_sensor():
            try:
                slave_id = int(slave_id_var.get())
                start_addr = int(addr_var.get())
                reg_count = int(count_var.get())
                ner_pos = int(pos_var.get())
                
                name = f"NER_{slave_id}"
                
                self.sensor_tree.insert('', tk.END, values=(
                    "NER",
                    name,
                    slave_id,
                    f"0x{start_addr:04X}",
                    f"Pos: {ner_pos}, Count: {reg_count}"
                ))
                win.destroy()
            except ValueError as e:
                messagebox.showerror("Error", f"Invalid input: {str(e)}")
        
        tk.Button(win, text="Save", command=save_sensor).grid(row=4, column=0, columnspan=2, pady=5)

    def remove_sensor(self):
        """Remove selected sensor from configuration"""
        selection = self.sensor_tree.selection()
        if selection:
            self.sensor_tree.delete(selection)

    def save_new_node(self, window, node_id, site, ip, port):
        """Save new node configuration and start it"""
        if not node_id or not ip:
            messagebox.showerror("Error", "Node ID and IP address are required")
            return
            
        if node_id in get_all_nodes():
            messagebox.showerror("Error", f"Node ID {node_id} already exists")
            return
            
        try:
            port = int(port)
        except ValueError:
            messagebox.showerror("Error", "Port must be a number")
            return
            
        sensors = []
        for item in self.sensor_tree.get_children():
            values = self.sensor_tree.item(item, 'values')
            if values[0] == "RES":
                sensors.append({
                    'type': 'RES',
                    'name': values[1],
                    'slave_id': int(values[2]),
                    'address': int(values[3], 16),
                    'count': int(values[4].split(": ")[1])
                })
            elif values[0] == "NER":
                details = values[4].split(", ")
                sensors.append({
                    'type': 'NER',
                    'name': values[1],
                    'slave_id': int(values[2]),
                    'start_address': int(values[3], 16),
                    'register_count': int(details[1].split(": ")[1]),
                    'ner_position': int(details[0].split(": ")[1])
                })
        
        if not sensors:
            messagebox.showerror("Error", "At least one sensor is required")
            return
            
        nodes_config = get_all_nodes()
        nodes_config[node_id] = {
            'ip': ip,
            'port': port,
            'site': site,
            'sensors': sensors
        }
        
        save_config()
        launch_node(node_id, nodes_config[node_id])
        window.destroy()
        self.refresh_dashboard()

    def refresh_dashboard(self):
        """Refresh the dashboard treeview"""
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        for node_id, cfg in get_all_nodes().items():
            sensor_names = ", ".join([s['name'] for s in cfg['sensors']])
            status = get_node_status(node_id)
            site = cfg.get('site', '')
            
            self.tree.insert('', tk.END, values=(
                node_id,
                f"{cfg['ip']}:{cfg['port']}",
                sensor_names,
                status,
                "View Log",
                site
            ))

    def auto_refresh(self):
        """Periodically refresh the dashboard"""
        self.refresh_dashboard()
        self.root.after(2000, self.auto_refresh)

    def show_log_window(self, event):
        """Show live log window for selected node"""
        selection = self.tree.selection()
        if not selection:
            return

        node_id = self.tree.item(selection[0], 'values')[0]

        win = tk.Toplevel(self.root)
        win.title(f"Live Logs for Node {node_id}")
        win.geometry("800x500")

        text = tk.Text(win, wrap=tk.WORD, state=tk.DISABLED)
        text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        scrollbar = ttk.Scrollbar(win, orient="vertical", command=text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        text.configure(yscrollcommand=scrollbar.set)

        def update_logs():
            if node_id in node_logs:
                text.config(state=tk.NORMAL)
                text.delete(1.0, tk.END)
                for log_entry in node_logs[node_id]:
                    text.insert(tk.END, log_entry + "\n")
                text.config(state=tk.DISABLED)
                text.see(tk.END)

            if win.winfo_exists():
                win.after(1000, update_logs)

        update_logs()

        tk.Button(win, text="Close", command=win.destroy).pack(side=tk.BOTTOM, pady=5)

    def delete_selected_node(self):
        """Delete the selected node"""
        selection = self.tree.selection()
        if not selection:
            return
            
        node_id = self.tree.item(selection[0], 'values')[0]
        
        if messagebox.askyesno(
            "Confirm Delete",
            f"Are you sure you want to delete node {node_id}?",
            parent=self.root
        ):
            delete_node(node_id)
            self.refresh_dashboard()

if __name__ == "__main__":
    root = tk.Tk()
    try:
        gui = NodeManagerGUI(root)
        root.mainloop()
    finally:
        from modbus_backend import cleanup
        cleanup()
