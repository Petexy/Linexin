#!/usr/bin/env python3

import gi
import subprocess
import threading
import gettext
import locale
import os
import shutil

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
from gi.repository import Gtk, Adw, GLib, Gdk

# Set up internationalization (i18n)
LOCALEDIR = "/usr/share/locale"
DOMAIN = "affinity-installer"

def setup_gettext():
    try:
        locale.setlocale(locale.LC_ALL, '')
        lang, encoding = locale.getlocale()
        if lang is None:
            lang = 'en'
    except locale.Error:
        lang = 'en'

    gettext.bindtextdomain(DOMAIN, LOCALEDIR)
    gettext.textdomain(DOMAIN)
    translation = gettext.translation(DOMAIN, LOCALEDIR, languages=[lang], fallback=True)
    translation.install()

setup_gettext()
_ = gettext.gettext

class MainWindow(Adw.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app)
        self.set_default_size(500, 250)
        self.set_title(_("Affinity Installater"))
        
        css_provider = Gtk.CssProvider()
        css = """
        headerbar {
            background-color: transparent;
            border: none;
            box-shadow: none;
        }
        .titlebar {
            background-color: transparent;
        }
        .linexin-app-buttons {
            font-size: 16px;
            padding: 10px 20px; 
            min-width: 150px;
            min-height: 40px; 
        }
        """
        css_provider.load_from_data(css.encode())
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            css_provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        self.output_buffer = []
        self.is_running = False
        self.selected_file = None
        self.file_chooser_event = None

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.header_bar = Adw.HeaderBar()
        self.header_bar.set_show_end_title_buttons(True)
        main_box.append(self.header_bar)

        content_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        content_box.set_margin_top(12)
        content_box.set_margin_bottom(12)
        content_box.set_margin_start(12)
        content_box.set_margin_end(12)
        content_box.set_vexpand(True)

        self.warning_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.warning_box.set_halign(Gtk.Align.CENTER)
        self.warning_box.set_valign(Gtk.Align.CENTER)
        self.warning_box.set_visible(False)
        content_box.append(self.warning_box)
        
        self.warning_label_line1 = Gtk.Label(label=_("Installation is in progress..."))
        self.warning_label_line1.set_margin_top(50)
        self.warning_label_line1.set_halign(Gtk.Align.CENTER)
        self.warning_label_line1.set_valign(Gtk.Align.CENTER)
        self.warning_box.append(self.warning_label_line1)

        self.warning_label_line2 = Gtk.Label()
        self.warning_label_line2.set_halign(Gtk.Align.CENTER)
        self.warning_label_line2.set_valign(Gtk.Align.CENTER)
        self.warning_label_line2.set_markup(
            '<span foreground="red" weight="bold" size="large">{}</span>'.format(_("Do NOT close the app!"))
        )
        self.warning_box.append(self.warning_label_line2)

        self.status_label = Gtk.Label()
        self.status_label.set_halign(Gtk.Align.CENTER)
        self.status_label.set_valign(Gtk.Align.CENTER)
        self.status_label.set_visible(False)
        content_box.append(self.status_label)

        self.text_view = Gtk.TextView()
        self.text_view.set_editable(False)
        self.text_view.set_monospace(True)
        self.text_view.set_visible(False)

        scrolled_window = Gtk.ScrolledWindow()
        scrolled_window.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scrolled_window.set_child(self.text_view)
        scrolled_window.set_vexpand(True)
        scrolled_window.set_hexpand(True)
        scrolled_window.set_visible(False)

        self.scrolled_window = scrolled_window
        content_box.append(self.scrolled_window)

        spacer = Gtk.Box()
        spacer.set_vexpand(True)
        content_box.append(spacer)

        button_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        button_box.set_halign(Gtk.Align.CENTER)
        button_box.set_hexpand(True)
        content_box.append(button_box)

        self.update_button = Gtk.Button(label=_("Install Affinity program"))
        self.update_button.add_css_class("suggested-action")
        self.update_button.add_css_class("linexin-app-buttons")
        self.update_button.connect("clicked", self.on_update_button_clicked)
        button_box.append(self.update_button)

        self.show_progress_button = Gtk.Button(label=_("Show progress"))
        self.show_progress_button.set_sensitive(False)
        self.show_progress_button.connect("clicked", self.on_toggle_progress_clicked)
        button_box.append(self.show_progress_button)

        main_box.append(content_box)
        self.set_content(main_box)

    def on_update_button_clicked(self, button):
        self.update_button.set_sensitive(False)
        self.show_progress_button.set_sensitive(True)
        self.header_bar.set_sensitive(False)
        self.header_bar.set_visible(False)

        self.output_buffer.clear()
        self.text_view.get_buffer().set_text("")
        self.selected_file = None
        self.file_chooser_event = None

        self.text_view.set_visible(False)
        self.scrolled_window.set_visible(False)
        self.show_progress_button.set_label(_("Show progress"))
        self.show_progress_button.add_css_class("linexin-app-buttons")
        self.status_label.set_visible(False)
        self.is_running = True
        self.update_warning_visibility()

        threading.Thread(target=self.run_update_command, daemon=True).start()

    def on_toggle_progress_clicked(self, button):
        if self.text_view.get_visible():
            self.text_view.set_visible(False)
            self.scrolled_window.set_visible(False)
            self.show_progress_button.set_label(_("Show progress"))
        else:
            self.text_view.set_visible(True)
            self.scrolled_window.set_visible(True)
            self.show_progress_button.set_label(_("Hide progress"))
            buffer = self.text_view.get_buffer()
            buffer.set_text("\n".join(self.output_buffer))
            end_iter = buffer.get_end_iter()
            self.text_view.scroll_to_iter(end_iter, 0.0, False, 0.0, 0.0)

        self.update_warning_visibility()

    def show_file_chooser(self):
        """Show a file chooser dialog and set the selected file path."""
        dialog = Gtk.FileChooserDialog(
            title=_("Select Installer File"),
            transient_for=self,
            action=Gtk.FileChooserAction.OPEN,
        )
        dialog.add_button(_("Cancel"), Gtk.ResponseType.CANCEL)
        dialog.add_button(_("Open"), Gtk.ResponseType.OK)

        file_filter = Gtk.FileFilter()
        file_filter.set_name(_("Executable Files"))
        file_filter.add_pattern("*.exe")
        dialog.add_filter(file_filter)

        def on_response(dialog, response_id):
            if response_id == Gtk.ResponseType.OK:
                self.selected_file = dialog.get_file().get_path()
                self.output_buffer.append(_("Selected file: {}").format(self.selected_file))
                GLib.idle_add(self.append_output_if_visible, _("Selected file: {}").format(self.selected_file))
            else:
                self.selected_file = None
                self.output_buffer.append(_("No file selected for installer."))
                GLib.idle_add(self.append_output_if_visible, _("No file selected for installer."))
            dialog.destroy()
            self.file_chooser_event.set()

        dialog.connect("response", on_response)
        dialog.present()

    def run_update_command(self):
        return_code = -1
        try:
            # First command (requires root privileges)
            process = subprocess.Popen(
                "run0 pacman -Syu wine-affinity --noconfirm && chmod 775 $HOME/.config/wine-affinity-config.sh",
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )

            while True:
                output = process.stdout.readline()
                if output == "" and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    self.output_buffer.append(line)
                    GLib.idle_add(self.append_output_if_visible, line)

            return_code = process.poll()
            if return_code == 0:
                self.output_buffer.append(_("Root command completed successfully."))
                GLib.idle_add(self.append_output_if_visible, _("Root command completed successfully."))
            else:
                error_line = _("Root command failed with return code {}.").format(return_code)
                self.output_buffer.append(error_line)
                GLib.idle_add(self.append_output_if_visible, error_line)
                return  # Skip subsequent commands if root command fails

            # Second command (non-root, placeholder)
            second_command = "bash $HOME/.config/wine-affinity-config.sh"  
            process_second = subprocess.Popen(
                second_command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )

            while True:
                output = process_second.stdout.readline()
                if output == "" and process_second.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    self.output_buffer.append(line)
                    GLib.idle_add(self.append_output_if_visible, line)

            second_return_code = process_second.poll()
            if second_return_code == 0:
                self.output_buffer.append(_("Second command completed successfully."))
                GLib.idle_add(self.append_output_if_visible, _("Second command completed successfully."))
            else:
                error_line = _("Second command failed with return code {}.").format(second_return_code)
                self.output_buffer.append(error_line)
                GLib.idle_add(self.append_output_if_visible, error_line)
                return  # Skip subsequent commands if second command fails

            # Show file chooser dialog for third command
            self.file_chooser_event = threading.Event()
            GLib.idle_add(self.show_file_chooser)
            self.file_chooser_event.wait()

            if self.selected_file is None:
                return_code = -1
                return  # Skip subsequent commands if no file is selected

            # Third command (non-root)
            third_command = f'rum wine-affinity "{os.path.expanduser("~/.WineAffinity")}" wine "{self.selected_file}"'
            process_third = subprocess.Popen(
                third_command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )

            while True:
                output = process_third.stdout.readline()
                if output == "" and process_third.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    self.output_buffer.append(line)
                    GLib.idle_add(self.append_output_if_visible, line)

            third_return_code = process_third.poll()
            if third_return_code == 0:
                self.output_buffer.append(_("Third command completed successfully."))
                GLib.idle_add(self.append_output_if_visible, _("Third command completed successfully."))
            else:
                error_line = _("Third command failed with return code {}.").format(third_return_code)
                self.output_buffer.append(error_line)
                GLib.idle_add(self.append_output_if_visible, error_line)
                return_code = third_return_code  # Update return_code to reflect failure
                return  # Skip fourth command if third command fails

            # Fourth command: Check for folders and move .desktop files
            affinity_dir = os.path.expanduser("~/.WineAffinity/drive_c/Program Files/Affinity")
            shortcuts_dir = os.path.expanduser("~/.local/share/linexin/shortcuts")
            applications_dir = os.path.expanduser("~/.local/share/applications")
            folder_desktop_map = {
                "Photo 2": "photo-2.desktop",
                "Designer 2": "designer-2.desktop",
                "Publisher 2": "publisher-2.desktop" 
            }

            # Ensure applications directory exists
            os.makedirs(applications_dir, exist_ok=True)

            for folder, desktop_file in folder_desktop_map.items():
                folder_path = os.path.join(affinity_dir, folder)
                source_path = os.path.join(shortcuts_dir, desktop_file)
                dest_path = os.path.join(applications_dir, desktop_file)

                if os.path.isdir(folder_path):
                    if os.path.isfile(source_path):
                        try:
                            shutil.move(source_path, dest_path)
                            self.output_buffer.append(_(f"Moved {desktop_file} to {applications_dir}"))
                            GLib.idle_add(self.append_output_if_visible, _(f"Moved {desktop_file} to {applications_dir}"))
                        except Exception as e:
                            error_line = _(f"Failed to move {desktop_file}: {str(e)}")
                            self.output_buffer.append(error_line)
                            GLib.idle_add(self.append_output_if_visible, error_line)
                    else:
                        error_line = _(f"{desktop_file} not found in {shortcuts_dir}")
                        self.output_buffer.append(error_line)
                        GLib.idle_add(self.append_output_if_visible, error_line)
                else:
                    self.output_buffer.append(_(f"{folder} not found in {affinity_dir}"))
                    GLib.idle_add(self.append_output_if_visible, _(f"{folder} not found in {affinity_dir}"))

            # Set return_code to 0 if all commands completed successfully
            if return_code == 0:
                self.output_buffer.append(_("Fourth command completed successfully."))
                GLib.idle_add(self.append_output_if_visible, _("Fourth command completed successfully."))

        except Exception as e:
            error_line = _("Error: {}").format(str(e))
            self.output_buffer.append(error_line)
            GLib.idle_add(self.append_output_if_visible, error_line)
            return_code = -1
        finally:
            self.is_running = False

            def finish_update_ui():
                self.update_button.set_sensitive(True)
                self.header_bar.set_sensitive(True)
                self.header_bar.set_visible(True)
                self.update_warning_visibility()

                self.status_label.set_visible(True)
                self.text_view.set_visible(False)
                self.scrolled_window.set_visible(False)
                if return_code == 0:
                    self.status_label.set_margin_top(40)
                    self.status_label.set_markup('<span foreground="green" size="large">✅ {}</span>'.format(_("Update completed successfully.")))
                else:
                    self.status_label.set_margin_top(40)
                    self.status_label.set_markup('<span foreground="red" size="large">❌ {}</span>'.format(_("Update failed (code {}).").format(return_code)))

            GLib.idle_add(finish_update_ui)

    def append_output_if_visible(self, text):
        if self.text_view.get_visible():
            buffer = self.text_view.get_buffer()
            end_iter = buffer.get_end_iter()
            buffer.insert(end_iter, text + "\n")
            self.text_view.scroll_to_iter(end_iter, 0.0, False, 0.0, 0.0)

    def update_warning_visibility(self):
        should_show = self.is_running and not self.text_view.get_visible()
        self.warning_box.set_visible(should_show)

class MyApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id="github.petexy.affinityinstaller")
        self.connect("activate", self.on_activate)

    def on_activate(self, app):
        window = MainWindow(self)
        window.present()

def main():
    app = MyApp()
    app.run()

if __name__ == "__main__":
    main()