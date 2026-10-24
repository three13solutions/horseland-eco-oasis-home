# Architecture

- Mount shared scroll navigation at the application root and discover actual overflow containers, so public pages, admin screens, and portalled dialogs receive the same accessible controls without changing saved content.
- Register transformed carousels explicitly with the shared navigation layer, because their slide movement is not native scrolling.