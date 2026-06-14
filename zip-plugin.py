import os
import zipfile

def zip_plugin(folder_path, output_path):
    """
    Empacota o diretório do plugin em um arquivo ZIP mantendo a estrutura.
    """
    print(f"Iniciando empacotamento do plugin de: {folder_path} ...")
    
    if not os.path.exists(folder_path):
        print(f"ERRO: Diretório {folder_path} não existe.")
        return False
        
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                # Caminho completo do arquivo no sistema de arquivos
                file_path = os.path.join(root, file)
                
                # Caminho relativo para manter a estrutura dentro do ZIP
                relative_path = os.path.relpath(file_path, os.path.dirname(folder_path))
                
                # Adiciona o arquivo ao ZIP
                zip_file.write(file_path, relative_path)
                print(f" Adicionado: {relative_path}")
                
    print(f"\nSucesso! Plugin empacotado com êxito em: {output_path}")
    return True

if __name__ == "__main__":
    # Define caminhos
    current_dir = os.path.dirname(os.path.abspath(__file__))
    plugin_folder = os.path.join(current_dir, "ia-live-editor")
    zip_output = os.path.join(current_dir, "ia-live-editor.zip")
    
    # Executa compactação
    zip_plugin(plugin_folder, zip_output)
