# ADGMaker

import argparse
import binascii
import gzip
import os
import platform
import shutil
from pathlib import Path

import pkg_resources
from jinja2 import Environment, FileSystemLoader


class ADGMaker(object):

    def __init__(self, debug=False, file_type="wav"):
        self.file_type = file_type
        self.debug = debug

        # Ex: {'cello_05_forte_arco-normal': [ xml, xml, .. ]
        self.adgs = {}
        self.default_note = 104

        self.jenv = Environment(loader=FileSystemLoader(os.path.dirname(os.path.realpath(__file__))),
                                trim_blocks=True)

    def empty_adgs(self):
        self.adgs = {}

    def all_adgs(self):
        return self.adgs

    def add_sample_file_to_instrument(self, file_path, adg_name, note_value):

        instrument_xml = self.create_instrument_xml(file_path, note_value)

        if adg_name in self.adgs:
            adg_contents = self.adgs[adg_name]
        else:
            adg_contents = []

        adg_contents.append(instrument_xml)
        self.adgs[adg_name] = adg_contents

        return

    def create_base_xml(self, adg_name):
        """
        Create the standard cruft XML for the ADG.
        """

        items = self.adgs[adg_name]
        xml = self.jenv.get_template('base_xml.tpl').render(
            items=items,
        )

        return xml

    def create_instrument_xml(self, file_path, note_value):

        dot_file_type = '.' + self.file_type

        name = file_path.split(dot_file_type)[0].split(os.sep)[-1]
        file_name = name + dot_file_type
        ableton_path = "userfolder:" + file_path.rsplit(os.sep, 1)[0] + os.sep + '#' + file_name

        path_hint_els = self.crate_path_hint(file_path)

        data = binascii.hexlify(file_path.encode('utf-16')).decode('utf-8').upper()

        xml = self.jenv.get_template('instrument_xml.tpl').render(
            path_hint_els=path_hint_els,
            name=name,
            sample_file_name=file_name,
            note_value=note_value,
            ableton_path=ableton_path,
            data=data
        )

        return xml

    def crate_path_hint(self, file_path):
        hint_els = []
        for part in file_path.rsplit(os.sep)[1:-1]:
            hint_els.append('<RelativePathElement Dir="%s" />' % part)

        return '\n'.join(hint_els)

    def create_adg(self, adg_name, xml):
        """
        Create the final ADG file.
        """

        xml_name = adg_name + '.xml'
        adg_file = adg_name + '.adg'

        f = open(xml_name, 'w')
        f.write(xml)
        f.close()

        with open(xml_name, 'rb') as f_in:
            with gzip.open(adg_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        if not self.debug:
            os.remove(xml_name)

        print("Created " + adg_file)

        return adg_file


class SamplePackAdgMaker:

    def __init__(self, file_type="wav"):
        self.file_type = file_type
        self.adg_maker = ADGMaker(file_type=file_type)

    def handle(self, argv=None):
        """
        Main function.

        Parses command, load settings and dispatches accordingly.

        """
        help_message = "Please supply a path to a folder of samples. See --help for more options."
        parser = argparse.ArgumentParser(description='ADGMaker - Create Ableton Live Instruments.\n')
        parser.add_argument('samples_path', metavar='U', type=str, nargs='*', help=help_message)

        parser.add_argument('-l', '--loops', action='store_true', help='Include suspected loop dirs (excluded by '
                                                                       'default)', default=False)
        parser.add_argument('-n', '--name', type=str, help='Name', default=False)
        parser.add_argument('-d', '--debug', action='store_true', help='Debug (no delete XML)', default=False)
        parser.add_argument('-v', '--version', action='store_true', default=False,
                            help='Display the current version of ADGMaker')

        args = parser.parse_args(argv)
        self.vargs = vars(args)

        print(self.vargs)

        if self.vargs['version']:
            version = pkg_resources.require("adgmaker")[0].version
            print(version)
            return

        # Samples are an important requirement.
        if not self.vargs['samples_path']:
            print(help_message)
            return

        if self.vargs['samples_path']:
            self.create_adg_from_samples_path(self.vargs['samples_path'][0], self.vargs['name'], self.vargs['loops'])

        print("Done! Remember to update your User Library in Live to see these new instruments!")

    def get_subdirs_containing_valid_samples(self, path, include_loops=False):
        return [p for p in Path(path).iterdir() if
                p.is_dir() and (include_loops is True or (include_loops is False and 'loop' not in p.name.lower()))]

    def create_adg_from_samples_path(self, samples_path, given_name=None, include_loops=False):
        """
        Create an ADG from the samples path.

        """
        file_type_wildcard = f'*.{self.file_type}'

        if given_name is None:
            given_name = Path(samples_path).parts[-1]

        subdirs = self.get_subdirs_containing_valid_samples(samples_path, include_loops)

        for subdir in subdirs:

            adg_name = f'{given_name} - {subdir.name}'

            samples_list = list(Path(subdir).rglob(file_type_wildcard))[0:104]

            for i, sample_file in enumerate(samples_list):
                file_path = os.path.abspath(sample_file)

                note_value = 104 - i
                self.adg_maker.add_sample_file_to_instrument(file_path, adg_name, note_value)

        for adg_name in self.adg_maker.all_adgs():  # self.adgs.keys():
            final_xml = self.adg_maker.create_base_xml(adg_name)
            self.adg_maker.create_adg(adg_name, final_xml)


if __name__ == '__main__':  # pragma: no cover
    SamplePackAdgMaker().handle()
